#!/bin/bash
# =============================================================================
# Script de inicialização do PostgreSQL
# Cria os bancos de dados e usuários para OpenProject e Mattermost
# =============================================================================
# Este script é executado automaticamente quando o container PostgreSQL
# é iniciado pela primeira vez (volume vazio). Ele NÃO será executado
# em reinicializações subsequentes.
#
# Os bancos são criados com:
#   - Usuário dedicado para cada serviço
#   - Senha definida via variável POSTGRES_PASSWORD do .env
#   - Permissões restritas ao mínimo necessário
# =============================================================================

set -e
set -o pipefail

# =============================================================================
# Configuração
# =============================================================================
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?ERRO: POSTGRES_PASSWORD não definida}"

# =============================================================================
# Funções auxiliares
# =============================================================================

# Cria um banco de dados e um usuário dedicado com permissões completas
create_database_and_user() {
    local db_name="$1"
    local db_user="$2"
    local db_password="$3"

    echo "============================================"
    echo "[init-db] Criando banco: ${db_name}"
    echo "[init-db] Criando usuário: ${db_user}"
    echo "============================================"

    # Verifica se o banco já existe
    if psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c \
        "SELECT 1 FROM pg_database WHERE datname = '${db_name}'" | grep -q 1; then
        echo "[init-db] Banco '${db_name}' já existe. Pulando criação."
    else
        # Cria o usuário
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
            -- Criar usuário dedicado
            DO \$\$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${db_user}') THEN
                    CREATE ROLE ${db_user} WITH LOGIN PASSWORD '${db_password}';
                    RAISE NOTICE 'Usuário ${db_user} criado com sucesso';
                ELSE
                    RAISE NOTICE 'Usuário ${db_user} já existe';
                END IF;
            END
            \$\$;

            -- Criar banco de dados
            SELECT 'CREATE DATABASE ${db_name} OWNER ${db_user}'
            WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db_name}')\gexec

            -- Conceder permissões
            GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO ${db_user};
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${db_user};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${db_user};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${db_user};
EOSQL

        echo "[init-db] Banco '${db_name}' criado com sucesso."
    fi

    # Concede permissões de schema dentro do banco criado
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${db_name}" <<-EOSQL
        GRANT ALL PRIVILEGES ON SCHEMA public TO ${db_user};
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${db_user};
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${db_user};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${db_user};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${db_user};
EOSQL

    echo "[init-db] Permissões configuradas para '${db_user}' em '${db_name}'."
    echo ""
}

# =============================================================================
# Criação dos bancos de dados
# =============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Inicialização do PostgreSQL - Oracle Cloud Free Tier       ║"
echo "║  OpenProject + Mattermost                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# --- OpenProject ---
create_database_and_user "openproject" "openproject" "${POSTGRES_PASSWORD}"

# --- Mattermost ---
create_database_and_user "mattermost" "mattermost" "${POSTGRES_PASSWORD}"

# =============================================================================
# Otimizações pós-criação
# =============================================================================
echo "[init-db] Aplicando otimizações de performance..."

for db in openproject mattermost; do
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${db}" <<-EOSQL
        -- Aumentar work_mem para consultas complexas do OpenProject/Mattermost
        ALTER DATABASE ${db} SET work_mem = '64MB';

        -- Manter um pool maior de conexões
        ALTER DATABASE ${db} SET max_connections = 100;

        -- Otimizar planner
        ALTER DATABASE ${db} SET random_page_cost = 1.1;
        ALTER DATABASE ${db} SET effective_cache_size = '512MB';
EOSQL
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Inicialização concluída com sucesso!                       ║"
echo "║  Bancos criados: openproject, mattermost                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
