<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:14B8A6,100:0F766E&height=140&section=header&text=EsteticaFlow&fontSize=42&fontColor=ffffff&fontAlignY=35"/>

<h1 align="center">EsteticaFlow 🚗✨</h1>

<p align="center">
  <strong>ERP / SaaS</strong> de gestão para empresas de <strong>estética automotiva</strong>
</p>

<p align="center">
  Clientes · Veículos · Agenda · Serviços · Estoque · Financeiro · Relatórios · Multiempresa
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/Spring%20Boot-3.3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Thymeleaf-005F0F?style=for-the-badge&logo=thymeleaf&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

---

## 💡 Sobre o projeto

O **EsteticaFlow** é um sistema web completo para oficinas e estéticas automotivas gerenciarem o dia a dia em um só lugar.

Foi pensado como um **mini SaaS multiempresa**, com planos **Básico** e **Completo**, painel de Super Admin e fluxo de aprovação para alterações cadastrais.

> Backend e frontend são a **mesma aplicação** Spring Boot (Thymeleaf + CSS/JS estáticos).  
> Hospedar o sistema = **1 serviço Java + 1 banco PostgreSQL**.

---

## ✨ Funcionalidades

- 👥 **Clientes e veículos** com histórico de atendimento  
- 📅 **Agenda** com múltiplos serviços por agendamento  
- 🛠️ **Catálogo de serviços** e categorias  
- 📦 **Estoque** com movimentações e custo de embalagem  
- 💰 **Financeiro** (receitas, despesas e indicadores)  
- 📊 **Relatórios** em PDF / Excel (conforme o plano)  
- 🏢 **Multiempresa** + planos de assinatura  
- 🔐 **Super Admin**, notificações e solicitações de alteração  
- 🎨 **Personalização de tema** no plano Completo  

---

## 🚀 Tecnologias

<p align="center">
  <img src="https://skillicons.dev/icons?i=java,spring,postgres,html,css,js,docker,git,github,maven,idea" />
</p>

| Camada | Stack |
| --- | --- |
| Backend | Java 21 · Spring Boot 3.3 (Web, Security, Data JPA, Validation) |
| Frontend | Thymeleaf + CSS/JS estáticos |
| Banco | PostgreSQL · migrations com **Flyway** |
| Relatórios | OpenPDF (PDF) · Apache POI (Excel) |
| Deploy | Docker · Maven · Render + Supabase (produção) |

---

## ▶️ Como rodar localmente

### Pré-requisitos

- Java 21+
- Maven 3.9+
- Docker Desktop **ou** PostgreSQL local

### Opção 1 — Tudo no Docker (recomendado)

```bash
# 1) Copie o exemplo de ambiente e ajuste a senha
cp .env.example .env

# 2) Suba app + banco
docker compose up -d --build
```

- App: [http://localhost:8080](http://localhost:8080)  
- Postgres (Docker): `localhost:5433`  
- O Flyway aplica as migrations na subida  

### Opção 2 — Banco no Docker + app na IDE

```bash
cp .env.example .env
docker compose up -d postgres
mvn spring-boot:run -Dspring-boot.run.profiles=local-docker
```

### Testes

```bash
mvn test
```

> Detalhes extras: veja também [`COMO-RODAR.md`](./COMO-RODAR.md).

---

## ⚙️ Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `SPRING_DATASOURCE_URL` | JDBC do PostgreSQL (em produção use `?sslmode=require`) |
| `SPRING_DATASOURCE_USERNAME` | Usuário do banco |
| `SPRING_DATASOURCE_PASSWORD` | Senha do banco |
| `SPRING_PROFILES_ACTIVE` | Ex.: `prod`, `local-docker`, `docker` |
| `SERVER_PORT` / `PORT` | Porta HTTP (Render injeta `PORT`) |

**Nunca** versionar senhas reais. Use `.env` (gitignore) ou secrets do provedor.

---

## ☁️ Produção

Arquitetura atual de referência:

```text
Internet (HTTPS)
      │
  Render (Spring Boot / Docker)
      │
  Supabase (PostgreSQL)
```

1. Banco no **Supabase** (preferir **Session pooler** / IPv4 no Render)  
2. Web Service **Docker** no **Render**  
3. Variáveis `SPRING_DATASOURCE_*` + `SPRING_PROFILES_ACTIVE=prod`  
4. Após o primeiro deploy, limpar dados de demonstração no SQL Editor se necessário  

---

## 📁 Estrutura (visão geral)

```text
esteticaFlow/
├── src/main/java/br/esteticadesk/   # domínio, services, controllers
├── src/main/resources/
│   ├── db/migration/                # Flyway (V1…Vn) — não apagar em produção
│   ├── templates/                   # Thymeleaf
│   └── static/                      # CSS / JS
├── Dockerfile
├── docker-compose.yml
└── pom.xml
```

---

## 👨‍💻 Autor

<p align="center">
  <strong>Gabriel Cardoso</strong><br/>
  Estudante de Desenvolvimento de Sistemas · SENAC
</p>

<p align="center">
  <a href="mailto:gabrielcardossso@gmail.com">
    <img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white" />
  </a>
  <a href="https://www.linkedin.com/in/gabrielcardossso/">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" />
  </a>
  <a href="https://instagram.com/gabrielcrds_09">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" />
  </a>
  <a href="https://wa.me/5548991746960">
    <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  </a>
</p>

---

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:14B8A6,100:0F766E&height=120&section=footer"/>
