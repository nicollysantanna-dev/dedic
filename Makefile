.DEFAULT_GOAL := help

NPM ?= npm

.PHONY: help install ci dev preview format format-check lint typecheck test test-watch coverage e2e build validate check supabase-start supabase-status supabase-stop supabase-reset

help: ## Lista os comandos disponíveis
	@awk 'BEGIN {FS = ":.*## "; printf "Uso: make <comando>\n\nComandos:\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Instala ou atualiza as dependências
	$(NPM) install

ci: ## Instala exatamente as versões do package-lock
	$(NPM) ci

dev: ## Inicia o servidor de desenvolvimento
	$(NPM) run dev

preview: ## Abre localmente o último build de produção
	$(NPM) run preview

format: ## Formata os arquivos do projeto
	$(NPM) run format

format-check: ## Verifica a formatação sem alterar arquivos
	$(NPM) run format:check

lint: ## Executa a análise estática
	$(NPM) run lint

typecheck: ## Verifica os tipos TypeScript
	$(NPM) run typecheck

test: ## Executa os testes unitários e de componentes
	$(NPM) run test

test-watch: ## Executa os testes em modo interativo
	$(NPM) run test:watch

coverage: ## Gera o relatório de cobertura dos testes
	$(NPM) run test:coverage

e2e: ## Executa as jornadas Playwright
	$(NPM) run test:e2e

build: ## Gera o build de produção
	$(NPM) run build

validate: ## Executa o quality gate completo
	$(NPM) run validate

check: validate ## Alias curto para o quality gate

supabase-start: ## Inicia o Supabase local
	$(NPM) run supabase:start

supabase-status: ## Exibe o estado do Supabase local
	$(NPM) run supabase:status

supabase-stop: ## Encerra o Supabase local
	$(NPM) run supabase:stop

supabase-reset: ## Recria o banco local e reaplica as migrações (destrutivo)
	@printf "Este comando apaga os dados do Supabase local. Continuar? [y/N] " && read answer && [ "$${answer}" = "y" ]
	$(NPM) run supabase:reset
