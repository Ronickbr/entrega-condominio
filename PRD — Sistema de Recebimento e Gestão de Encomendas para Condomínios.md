# PRD — Sistema de Recebimento e Gestão de Encomendas para Condomínios

**Versão:** 1.0  
**Status:** MVP / Planejamento  
**Plataforma:** Web Responsiva + PWA  
**Stack sugerida:** React + TypeScript + Supabase  
**Notificações:** Evolution API / WhatsApp + notificações internas  
**Implementação:** OpenCode

---

# 1. Visão Geral

O projeto consiste em uma plataforma para controle do recebimento, armazenamento lógico, notificação e entrega de encomendas em condomínios residenciais e prédios.

O sistema será utilizado principalmente por:

- Superadministrador;
- Síndico;
- Porteiros;
- Recepcionistas;
- Moradores;
- Pessoas autorizadas pelo morador.

O principal objetivo é substituir controles manuais, livros de registro, planilhas e comunicação informal por WhatsApp por um fluxo digital, rastreável e seguro.

O processo principal será:

**Encomenda chega → Porteiro identifica destinatário → Fotografa etiqueta → Sistema extrai dados → Porteiro confirma → Sistema registra → Morador é notificado → Morador ou terceiro retira → Porteiro confirma entrega → Histórico é armazenado.**

---

# 2. Objetivos do Produto

## 2.1 Objetivo principal

Digitalizar integralmente o fluxo de recebimento e retirada de encomendas dentro do condomínio.

## 2.2 Objetivos secundários

- Reduzir erros de identificação;
- reduzir tempo gasto pelo porteiro;
- automatizar notificações;
- manter histórico de recebimentos;
- identificar quem recebeu cada encomenda;
- identificar quem retirou cada encomenda;
- permitir retirada por terceiros;
- utilizar fotografia como evidência;
- manter trilha de auditoria;
- permitir acompanhamento pelo síndico;
- fornecer indicadores operacionais;
- diminuir encomendas esquecidas;
- automatizar lembretes;
- melhorar a experiência do morador.

---

# 3. Escopo Inicial

O MVP atenderá inicialmente **um único condomínio**.

Entretanto, a modelagem deverá evitar dependências que impossibilitem futuramente:

- múltiplos condomínios;
- administradoras;
- planos;
- assinaturas;
- cobrança;
- gestão SaaS.

Recomenda-se, portanto, que as principais entidades já possuam `condominium_id`, mesmo que inicialmente exista apenas um condomínio.

---

# 4. Perfis e Permissões

## 4.1 Super Admin

Possui acesso completo.

Pode:

- gerenciar condomínio;
- cadastrar síndicos;
- cadastrar porteiros;
- cadastrar recepcionistas;
- cadastrar moradores;
- cadastrar unidades;
- consultar todas as encomendas;
- consultar histórico;
- acessar dashboards;
- visualizar logs;
- configurar Evolution API;
- configurar notificações;
- editar templates;
- consultar falhas;
- gerenciar usuários;
- bloquear/desbloquear usuários;
- acessar configurações gerais.

---

## 4.2 Síndico

Pode:

- visualizar dashboard;
- consultar encomendas;
- consultar encomendas pendentes;
- consultar histórico;
- visualizar moradores;
- visualizar unidades;
- cadastrar/editar moradores;
- visualizar funcionários;
- consultar relatórios;
- acompanhar tempo de retirada;
- visualizar logs operacionais relevantes.

Não deverá acessar configurações críticas da infraestrutura.

---

## 4.3 Porteiro / Recepcionista

Responsável pela operação diária.

Pode:

- receber encomenda;
- fotografar etiqueta;
- cadastrar manualmente encomenda;
- selecionar morador;
- confirmar dados detectados automaticamente;
- corrigir dados;
- registrar transportadora;
- registrar código de rastreamento;
- consultar encomendas pendentes;
- pesquisar morador;
- registrar retirada;
- registrar retirada por terceiro;
- fotografar terceiro;
- consultar histórico operacional permitido.

---

## 4.4 Morador

Pode:

- acessar suas encomendas;
- visualizar encomendas aguardando retirada;
- visualizar histórico;
- visualizar foto da encomenda quando permitido;
- consultar data/hora de recebimento;
- consultar transportadora;
- consultar código de rastreamento;
- receber notificações;
- autorizar terceiro para retirada;
- acompanhar status.

O morador **não poderá visualizar encomendas de outras unidades**.

---

## 4.5 Terceiro autorizado

Não necessita obrigatoriamente possuir conta.

Sua retirada deverá ser vinculada a uma autorização realizada pelo morador.

O sistema poderá registrar:

- nome;
- documento quando necessário;
- foto;
- data/hora;
- morador responsável pela autorização;
- encomenda retirada.

---

# 5. Cadastro do Condomínio

Campos:

- Nome;
- CNPJ;
- telefone;
- e-mail;
- endereço;
- número;
- complemento;
- bairro;
- cidade;
- estado;
- CEP;
- logo;
- nome do síndico;
- telefone administrativo;
- status.

---

# 6. Estrutura de Unidades

O sistema deverá suportar diferentes estruturas.

Exemplos:

- Bloco A / Apartamento 101;
- Torre 2 / Apartamento 503;
- Apartamento 302;
- Casa 15.

Entidade de unidade:

```text
Condomínio
 └── Bloco/Torre
      └── Unidade
           └── Moradores
```

Nem todo condomínio possui bloco/torre.

Portanto, bloco deverá ser opcional.

---

# 7. Cadastro de Moradores

Campos principais:

- Nome completo;
- CPF;
- telefone;
- WhatsApp;
- e-mail;
- apartamento/unidade;
- bloco/torre;
- foto opcional;
- status;
- aceita notificações WhatsApp;
- aceita notificações pelo aplicativo.

Uma unidade poderá possuir múltiplos moradores.

### 7.1 Cadastro do morador pela página de login (auto-cadastro)

Além do cadastro feito pela administração, o **morador principal** pode se cadastrar sozinho, direto na página de login:

- O link **"Cadastre-se como morador"** abre o formulário sem sair do login, com os campos: nome completo, e-mail (credencial de acesso), senha, confirmação de senha, bloco, apartamento, WhatsApp para notificações e o checkbox obrigatório **"Sou morador deste apartamento"**.
- Ao concluir: cria o acesso, vincula o morador ao condomínio/bloco/apartamento e redireciona automaticamente para **"Minhas encomendas"**, exibindo a opção **"Adicionar moradores do apartamento"**.
- Os **moradores adicionais (co-moradores)** são cadastrados apenas pelo morador principal, **sem criar login** — servem para o sistema reconhecer seus nomes nas encomendas.
- A página de login mantém: campo de e-mail/usuário, campo de senha, botão **"Entrar"**, link **"Esqueci minha senha"** e link **"Cadastre-se como morador"**.

---

# 8. Fluxo Principal — Recebimento

## Etapa 1 — Encomenda chega

O entregador apresenta a encomenda na portaria.

O porteiro acessa:

**Nova Encomenda**

---

## Etapa 2 — Captura

O sistema deverá oferecer:

### Fotografar etiqueta

ou

### Cadastro manual

Preferencialmente, o botão principal será:

**Fotografar Etiqueta**

---

# 9. OCR / IA da Etiqueta

Após fotografar a etiqueta, o sistema deverá tentar identificar:

- nome do destinatário;
- endereço;
- apartamento;
- bloco;
- CPF parcialmente mascarado quando presente;
- telefone quando presente;
- transportadora;
- código de rastreamento;
- código de barras;
- QR Code;
- informações adicionais relevantes.

Exemplo:

```text
Destinatário:
João Carlos da Silva

Apartamento:
302

Transportadora:
Mercado Livre

Rastreamento:
MLB123456789
```

---

# 10. Confiança da Extração

Dados extraídos automaticamente **nunca deverão ser gravados como definitivos sem confirmação humana**.

Cada campo poderá possuir:

```text
Valor detectado
Confiança
```

Exemplo:

```text
Nome: João Carlos Silva
Confiança: 96%

Apartamento: 302
Confiança: 88%

Transportadora: Mercado Livre
Confiança: 99%
```

Campos com baixa confiança deverão receber destaque visual.

---

# 11. Correspondência Automática do Morador

Após extrair os dados, o sistema deverá procurar possíveis moradores.

Utilizar:

1. apartamento;
2. bloco;
3. nome;
4. CPF;
5. telefone.

Exemplo:

```text
Morador encontrado

João Carlos Silva
Bloco B
Apartamento 302

[Confirmar]
```

Caso existam vários resultados:

```text
Encontramos possíveis destinatários:

João Carlos Silva — B/302
João Carlos Souza — A/302
```

O porteiro deverá escolher manualmente.

---

# 12. Falha na Identificação

Se nenhum morador for encontrado:

```text
Não conseguimos identificar automaticamente o destinatário.
```

Permitir:

- pesquisar morador;
- pesquisar apartamento;
- pesquisar CPF;
- pesquisar telefone;
- selecionar manualmente;
- cadastrar como destinatário não identificado.

---

# 13. Confirmação do Recebimento

Antes de salvar:

```text
Nova Encomenda

Morador:
João Carlos Silva

Unidade:
Bloco B — 302

Transportadora:
Mercado Livre

Código:
MLB123456789

Recebido por:
Carlos — Portaria

Data:
17/08/2026

Hora:
14:32

Foto:
[imagem]

[Confirmar Recebimento]
```

---

# 14. Registro da Encomenda

Após confirmação, gerar:

- ID interno;
- condomínio;
- unidade;
- destinatário;
- foto;
- transportadora;
- rastreamento;
- funcionário responsável;
- data;
- hora;
- status.

Status inicial:

`AGUARDANDO_RETIRADA`

---

# 15. Status das Encomendas

Utilizar estados controlados.

```text
RECEBIDA
AGUARDANDO_RETIRADA
RETIRADA
RETIRADA_POR_TERCEIRO
NAO_IDENTIFICADA
DEVOLVIDA
CANCELADA
```

Internamente, recomenda-se registrar eventos em vez de depender exclusivamente do status atual.

---

# 16. Notificação do Morador

Após confirmação:

1. salvar encomenda;
2. gerar evento;
3. enviar notificação interna;
4. enviar WhatsApp;
5. registrar resultado do envio.

---

# 17. WhatsApp — Evolution API

Integração utilizando Evolution API.

Mensagem sugerida:

**📦 Nova encomenda recebida**

Olá, João!

Uma encomenda foi recebida para você na portaria.

**Unidade:** Bloco B — 302  
**Transportadora:** Mercado Livre  
**Recebida em:** 17/08/2026 às 14:32

Ela está aguardando retirada na portaria.

Acesse o aplicativo do condomínio para mais informações.

---

# 18. Controle das Mensagens

Toda tentativa deverá possuir registro.

Campos:

```text
recipient
phone
package_id
message_type
status
provider_message_id
attempts
sent_at
delivered_at
failed_at
error
```

Status:

```text
QUEUED
SENT
DELIVERED
READ
FAILED
```

Quando suportado pela Evolution API.

---

# 19. Notificações no Aplicativo

Criar central de notificações.

Exemplos:

- Nova encomenda recebida;
- lembrete de retirada;
- encomenda retirada;
- autorização utilizada;
- problema com encomenda.

Cada notificação terá:

- título;
- mensagem;
- tipo;
- referência;
- lida/não lida;
- data.

---

# 20. Lembretes Automáticos

O sistema deverá identificar encomendas ainda pendentes.

Configuração inicial sugerida:

- primeiro aviso: imediatamente;
- lembrete: 24 horas;
- segundo lembrete: 48 horas;
- terceiro lembrete: 72 horas.

Após isso, poderá continuar exibindo alerta no painel.

Esses períodos deverão ser configuráveis.

---

# 21. Retirada pelo Morador

Porteiro acessa:

**Encomendas Pendentes**

Pesquisa por:

- apartamento;
- bloco;
- nome;
- CPF;
- rastreamento.

Seleciona a encomenda.

Tela:

```text
Encomenda

João Carlos Silva
Bloco B — 302

Recebida:
17/08/2026 14:32

Transportadora:
Mercado Livre

[Confirmar Entrega]
```

---

# 22. Confirmação pelo Porteiro

Ao confirmar:

Registrar:

- funcionário responsável;
- data;
- hora;
- usuário que realizou operação;
- destinatário;
- tipo da retirada.

Alterar status para:

`RETIRADA`

Criar evento de auditoria.

---

# 23. Retirada por Terceiro

O morador poderá autorizar outra pessoa.

Campos:

- Nome;
- documento opcional/configurável;
- observação;
- encomendas autorizadas;
- validade.

Exemplo:

```text
Autorizo:

Maria Silva

A retirar:
Encomenda #ENC-00231

Validade:
Até 18/08/2026 às 23:59
```

---

# 24. Foto do Terceiro

No momento da retirada:

```text
Retirada por terceiro

Maria Silva

Autorizado por:
João Carlos Silva

[Capturar Foto]

[Confirmar Entrega]
```

A foto deverá ser armazenada no Supabase Storage.

Registrar:

- foto;
- porteiro;
- data;
- hora;
- autorização utilizada.

Status:

`RETIRADA_POR_TERCEIRO`

---

# 25. Prevenção de Retirada Duplicada

O backend deverá impedir que uma encomenda retirada seja retirada novamente.

Essa validação **não poderá depender somente do frontend**.

Tentativa duplicada deverá retornar erro amigável:

> Esta encomenda já foi retirada em 17/08/2026 às 18:42.

---

# 26. Dashboard do Porteiro

Interface operacional simples.

Mostrar principalmente:

```text
Encomendas aguardando retirada
12

Recebidas hoje
18

Retiradas hoje
14
```

Ações rápidas:

- Nova encomenda;
- Pendentes;
- Buscar morador;
- Registrar retirada.

Evitar gráficos desnecessários.

---

# 27. Dashboard do Síndico

Indicadores:

- recebidas hoje;
- recebidas na semana;
- recebidas no mês;
- retiradas;
- pendentes;
- pendentes >24h;
- pendentes >48h;
- pendentes >72h;
- tempo médio até retirada.

Gráficos:

- encomendas por dia;
- recebimentos x retiradas;
- encomendas por transportadora;
- unidades com maior volume.

---

# 28. Dashboard Super Admin

Além dos indicadores do síndico:

- usuários ativos;
- funcionários;
- moradores;
- falhas de WhatsApp;
- volume de armazenamento;
- eventos do sistema;
- operações recentes.

---

# 29. Aplicativo/PWA do Morador

Home:

```text
Olá, João 👋

Você possui:

📦 2 encomendas aguardando retirada
```

Seções:

- Pendentes;
- Histórico;
- Autorizações;
- Notificações;
- Perfil.

---

# 30. Página de Encomenda

Mostrar:

- foto;
- data;
- hora;
- transportadora;
- rastreamento;
- status;
- unidade;
- histórico.

Exemplo:

```text
17/08 14:32
Recebida na portaria

17/08 14:33
WhatsApp enviado

18/08 09:00
Lembrete enviado
```

---

# 31. Histórico por Eventos

Criar arquitetura baseada em eventos.

Tabela:

`package_events`

Tipos:

```text
PACKAGE_CREATED
PACKAGE_RECEIVED
RESIDENT_MATCHED
WHATSAPP_SENT
WHATSAPP_FAILED
REMINDER_SENT
THIRD_PARTY_AUTHORIZED
PACKAGE_COLLECTED
PACKAGE_COLLECTED_BY_THIRD_PARTY
PACKAGE_RETURNED
PACKAGE_CANCELLED
```

Isso permitirá reconstruir o histórico completo.

---

# 32. Auditoria

Operações sensíveis deverão possuir auditoria.

Registrar:

- usuário;
- ação;
- entidade;
- ID;
- valores anteriores;
- valores posteriores;
- data/hora;
- IP quando aplicável;
- user agent.

Exemplos:

```text
Morador alterado
Encomenda criada
Destinatário alterado
Retirada confirmada
Autorização criada
Usuário bloqueado
```

---

# 33. Banco de Dados — Supabase

Principais tabelas:

```text
condominiums
buildings
units
profiles
residents
staff
packages
package_images
package_events
package_extractions
third_party_authorizations
notifications
whatsapp_messages
audit_logs
system_settings
```

---

# 34. Tabela `condominiums`

```text
id UUID PK
name TEXT
cnpj TEXT
phone TEXT
email TEXT
address JSONB
logo_url TEXT
active BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

# 35. Tabela `units`

```text
id UUID PK
condominium_id UUID FK
building_id UUID FK nullable
number TEXT
floor TEXT nullable
active BOOLEAN
created_at TIMESTAMPTZ
```

---

# 36. Tabela `profiles`

Integrada ao `auth.users`.

```text
id UUID PK/FK auth.users
condominium_id UUID
full_name TEXT
cpf TEXT
phone TEXT
email TEXT
role TEXT
avatar_url TEXT
active BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Roles:

```text
SUPER_ADMIN
SYNDIC
DOORMAN
RECEPTIONIST
RESIDENT
```

---

# 37. Tabela `residents`

```text
id UUID PK
profile_id UUID
unit_id UUID
is_primary BOOLEAN
active BOOLEAN
created_at TIMESTAMPTZ
```

Isso permite um usuário estar relacionado a uma unidade sem acoplar a unidade diretamente à autenticação.

---

# 38. Tabela `packages`

```text
id UUID PK
condominium_id UUID FK
unit_id UUID FK
resident_id UUID FK
recipient_name_raw TEXT
carrier TEXT
tracking_code TEXT
status TEXT
received_by UUID
received_at TIMESTAMPTZ
collected_by UUID nullable
collected_at TIMESTAMPTZ nullable
collection_type TEXT nullable
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

# 39. Tabela `package_images`

```text
id UUID PK
package_id UUID FK
storage_path TEXT
image_type TEXT
created_by UUID
created_at TIMESTAMPTZ
```

Tipos:

```text
LABEL
PACKAGE
THIRD_PARTY
OTHER
```

---

# 40. Tabela `package_extractions`

Preservar resultado original da IA/OCR.

```text
id UUID PK
package_id UUID
raw_result JSONB
recipient_name TEXT
unit_number TEXT
cpf TEXT
phone TEXT
carrier TEXT
tracking_code TEXT
confidence JSONB
provider TEXT
created_at TIMESTAMPTZ
```

Isso é importante para auditoria e evolução futura do reconhecimento.

---

# 41. Autorizações

`third_party_authorizations`

```text
id UUID PK
resident_id UUID
package_id UUID
authorized_name TEXT
authorized_document TEXT
valid_until TIMESTAMPTZ
status TEXT
used_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

Status:

```text
ACTIVE
USED
EXPIRED
CANCELLED
```

---

# 42. Storage

Buckets sugeridos:

```text
package-labels
package-images
third-party-photos
avatars
condominium-assets
```

Arquivos deverão possuir caminhos não previsíveis.

Não utilizar buckets públicos para documentos contendo dados pessoais.

---

# 43. Segurança — Supabase RLS

RLS deverá estar habilitado nas tabelas contendo dados do condomínio.

Nunca depender somente da interface para autorização.

---

# 44. Políticas

### Morador

Pode visualizar somente:

- próprio perfil;
- própria unidade quando autorizado;
- próprias encomendas;
- próprias notificações;
- próprias autorizações.

### Porteiro

Pode acessar dados operacionais necessários do condomínio.

### Síndico

Pode consultar informações administrativas do condomínio.

### Super Admin

Pode acessar todas as informações administrativas.

---

# 45. Service Role

A chave `SUPABASE_SERVICE_ROLE_KEY` jamais poderá aparecer no frontend.

Operações privilegiadas deverão utilizar:

- Supabase Edge Functions;
- backend seguro.

---

# 46. Edge Functions

Sugestões:

```text
process-package-image
send-whatsapp
send-package-reminder
confirm-package-collection
authorize-third-party
process-evolution-webhook
cleanup-expired-authorizations
```

---

# 47. OCR / IA

Criar uma abstração:

```text
PackageExtractionService
```

Interface conceitual:

```text
extract(image)
→ recipient
→ apartment
→ cpf
→ phone
→ carrier
→ trackingCode
→ confidence
```

Não acoplar a aplicação diretamente a um único fornecedor de IA.

Isso permitirá substituir o serviço posteriormente.

---

# 48. Evolution API

Criar serviço isolado:

```text
WhatsAppService
```

Responsabilidades:

- envio;
- tratamento de erros;
- retry;
- status;
- webhooks;
- logs.

Credenciais nunca deverão ficar expostas no navegador.

---

# 49. Webhook Evolution API

Endpoint deverá:

1. validar requisição;
2. identificar evento;
3. localizar mensagem;
4. atualizar status;
5. registrar evento;
6. ignorar eventos duplicados.

O processamento deverá ser idempotente.

---

# 50. Retry de WhatsApp

Em caso de erro:

```text
tentativa 1 → imediata
tentativa 2 → +1 minuto
tentativa 3 → +5 minutos
```

Após limite:

`FAILED`

Disponibilizar opção de reenvio para usuário autorizado.

---

# 51. LGPD

O sistema armazenará:

- CPF;
- telefone;
- nomes;
- fotografias;
- registros de retirada;
- imagens de etiquetas;
- dados de terceiros.

Portanto, deverá considerar LGPD desde o MVP.

---

# 52. Princípios de Privacidade

Implementar:

- minimização de dados;
- acesso por função;
- logs;
- proteção de imagens;
- URLs assinadas;
- retenção;
- exclusão controlada;
- rastreabilidade.

Evitar exposição desnecessária do CPF.

Interface poderá apresentar:

```text
***.***.***-42
```

---

# 53. Retenção de Fotos

Criar configuração futura para retenção.

Exemplo:

```text
Etiqueta:
180 dias

Foto de terceiro:
180 dias

Histórico textual:
conforme política administrativa
```

Não fixar esses valores diretamente no código.

---

# 54. Concorrência

Cenário:

Dois porteiros abrem simultaneamente a mesma encomenda.

Ambos tentam confirmar retirada.

Somente a primeira operação deverá funcionar.

Utilizar transação/função SQL/controle atômico.

Conceitualmente:

```sql
UPDATE packages
SET status = 'RETIRADA'
WHERE id = ?
AND status = 'AGUARDANDO_RETIRADA';
```

Validar quantidade de registros alterados.

---

# 55. Idempotência

Operações importantes deverão suportar prevenção de duplicidade.

Especialmente:

- recebimento;
- confirmação de retirada;
- WhatsApp;
- webhooks;
- lembretes.

---

# 56. Busca

Busca global operacional por:

- nome;
- apartamento;
- bloco;
- CPF;
- telefone;
- rastreamento.

Normalizar:

- CPF;
- telefone;
- espaços;
- caixa;
- acentos quando aplicável.

---

# 57. UX da Portaria

A interface da portaria deverá ser otimizada para velocidade.

Objetivo:

**registrar uma encomenda em poucos segundos.**

Fluxo:

```text
Fotografar
↓
Analisar
↓
Selecionar morador
↓
Confirmar
```

Evitar formulários extensos.

---

# 58. Mobile First

A tela de recebimento deverá funcionar especialmente bem em smartphone.

Botões grandes.

Câmera acessível diretamente.

Exemplo:

**📷 Fotografar Etiqueta**

---

# 59. Feedback Visual

Durante OCR:

```text
Analisando etiqueta...
```

Depois:

```text
✓ Destinatário identificado
✓ Unidade encontrada
✓ Transportadora identificada
```

Quando houver dúvida:

```text
⚠ Confirme o apartamento
```

---

# 60. Tratamento de Erros

Não mostrar erros técnicos como:

```text
PostgrestError
PGRST116
23505
JWT expired
```

Transformar em mensagens compreensíveis.

Exemplo:

```text
Não foi possível registrar esta encomenda.

Verifique os dados e tente novamente.
```

Logs técnicos continuam disponíveis internamente.

---

# 61. Estados de Interface

Todas as páginas devem possuir:

- loading;
- vazio;
- sucesso;
- erro;
- sem permissão;
- offline quando aplicável.

---

# 62. PWA

A aplicação deverá permitir:

- instalação no celular;
- ícone;
- splash screen;
- manifest;
- service worker;
- comportamento responsivo.

---

# 63. Conectividade Ruim

Como portarias podem possuir internet instável, evitar perda imediata da captura.

Quando possível:

1. manter foto temporariamente;
2. informar perda de conexão;
3. tentar novamente;
4. impedir duplicação.

Sincronização offline completa poderá ficar para uma fase posterior.

---

# 64. Performance

Metas:

- dashboard inicial < 2 segundos em conexão adequada;
- busca percebida < 500 ms quando possível;
- compressão das imagens antes do upload;
- lazy loading;
- paginação;
- índices adequados.

---

# 65. Índices

Criar índices para campos frequentemente consultados.

Exemplos:

```text
packages(condominium_id, status)
packages(unit_id)
packages(resident_id)
packages(tracking_code)
packages(received_at)

profiles(condominium_id)
units(condominium_id)

notifications(user_id, read_at)
package_events(package_id, created_at)
```

---

# 66. Tela — Login

Campos:

- e-mail/telefone;
- senha;
- recuperar senha.

Após autenticação, redirecionar conforme role.

---

# 67. Rotas Sugeridas

```text
/login

/admin
/admin/dashboard
/admin/users
/admin/residents
/admin/units
/admin/packages
/admin/settings
/admin/audit

/syndic
/syndic/dashboard
/syndic/packages
/syndic/residents
/syndic/reports

/reception
/reception/dashboard
/reception/packages
/reception/packages/new
/reception/packages/:id
/reception/collection

/app
/app/packages
/app/packages/:id
/app/authorizations
/app/notifications
/app/profile
```

---

# 68. Componentes Principais

```text
PackageCard
PackageStatusBadge
PackageCamera
LabelScanner
OCRResult
ResidentSelector
ResidentSearch
PackageTimeline
CollectionModal
ThirdPartyAuthorization
ThirdPartyPhotoCapture
NotificationCenter
DashboardMetric
PackageFilters
```

---

# 69. Design System

Interface:

- moderna;
- limpa;
- profissional;
- confiável;
- acessível;
- mobile-first.

Evitar aparência excessivamente futurista ou genérica de dashboard gerado por IA.

Priorizar legibilidade e operação rápida.

---

# 70. Confirmações Sensíveis

Ações irreversíveis deverão pedir confirmação.

Exemplo:

```text
Confirmar entrega?

Você está registrando que esta encomenda foi entregue para João Carlos Silva.

[Cancelar] [Confirmar entrega]
```

---

# 71. Relatórios

Síndico/Super Admin poderão filtrar:

- período;
- unidade;
- morador;
- transportadora;
- status.

Dados:

- recebidas;
- retiradas;
- pendentes;
- tempo médio;
- quantidade por unidade.

Exportação CSV/PDF poderá ser adicionada posteriormente.

---

# 72. Observabilidade

Registrar erros de:

- OCR;
- banco;
- WhatsApp;
- autenticação;
- Storage;
- funções.

Logs não deverão revelar:

- senhas;
- tokens;
- service role;
- conteúdo sensível desnecessário.

---

# 73. Requisitos Não Funcionais

O sistema deverá:

- possuir TypeScript strict;
- validar inputs;
- possuir RLS;
- utilizar migrations;
- possuir tratamento centralizado de erros;
- evitar secrets no frontend;
- possuir arquitetura modular;
- possuir componentes reutilizáveis;
- possuir logs;
- possuir auditoria;
- ser responsivo;
- ser instalável como PWA.

---

# 74. Estrutura Recomendada do Projeto

```text
src/
├── components/
├── features/
│   ├── auth/
│   ├── packages/
│   ├── residents/
│   ├── units/
│   ├── notifications/
│   ├── authorizations/
│   └── dashboard/
├── hooks/
├── integrations/
│   ├── supabase/
│   └── evolution/
├── lib/
├── pages/
├── services/
├── types/
├── utils/
└── validations/

supabase/
├── migrations/
├── functions/
│   ├── process-package-image/
│   ├── send-whatsapp/
│   ├── confirm-package-collection/
│   └── process-evolution-webhook/
└── seed.sql
```

---

# 75. Variáveis de Ambiente

Exemplo:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=

AI_API_KEY=
```

Secrets de backend não deverão utilizar prefixo `VITE_`.

---

# 76. Migrations

Toda alteração estrutural deverá ser criada por migration.

Não depender de alterações manuais no dashboard do Supabase.

Isso inclui:

- tabelas;
- índices;
- triggers;
- funções;
- RLS;
- policies.

---

# 77. Seed

Criar ambiente de demonstração.

Exemplo:

```text
Condomínio Residencial Demo

Bloco A
101
102
103

Bloco B
201
202
203
```

Usuários fictícios:

- Super Admin;
- Síndico;
- Porteiro;
- Morador.

Criar também encomendas fictícias em diferentes estados.

---

# 78. Testes

Priorizar testes para:

- autenticação;
- permissões;
- RLS;
- criação de encomenda;
- OCR;
- matching;
- retirada;
- retirada duplicada;
- autorização;
- autorização expirada;
- retirada por terceiro;
- WhatsApp;
- webhook;
- lembretes.

---

# 79. Cenário E2E Principal

```text
Porteiro faz login
↓
Fotografa etiqueta
↓
OCR identifica João / 302
↓
Sistema encontra morador
↓
Porteiro confirma
↓
Encomenda criada
↓
WhatsApp enviado
↓
Morador visualiza no PWA
↓
Morador vai até portaria
↓
Porteiro localiza encomenda
↓
Confirma entrega
↓
Status alterado
↓
Evento registrado
```

Esse fluxo deve obrigatoriamente funcionar antes de considerar o MVP concluído.

---

# 80. Cenário E2E — Terceiro

```text
Encomenda recebida
↓
Morador recebe notificação
↓
Morador cria autorização
↓
Informa pessoa autorizada
↓
Terceiro chega à portaria
↓
Porteiro encontra autorização
↓
Captura foto
↓
Confirma retirada
↓
Autorização = USED
↓
Encomenda = RETIRADA_POR_TERCEIRO
↓
Evento registrado
```

---

# 81. Critérios de Aceite — Recebimento

O recurso estará concluído quando:

- [ ] Porteiro conseguir fotografar etiqueta.
- [ ] Imagem for enviada com segurança.
- [ ] OCR conseguir retornar dados estruturados.
- [ ] Resultado puder ser corrigido.
- [ ] Sistema sugerir morador.
- [ ] Porteiro puder selecionar outro morador.
- [ ] Encomenda puder ser confirmada.
- [ ] Foto ficar vinculada.
- [ ] Evento for criado.
- [ ] Morador receber notificação interna.
- [ ] WhatsApp for disparado.
- [ ] Falhas de WhatsApp forem registradas.

---

# 82. Critérios de Aceite — Retirada

- [ ] Porteiro consegue localizar encomenda.
- [ ] Somente encomenda pendente pode ser retirada.
- [ ] Confirmação é obrigatória.
- [ ] Porteiro fica registrado.
- [ ] Data/hora ficam registradas.
- [ ] Status é atualizado atomicamente.
- [ ] Evento é criado.
- [ ] Retirada duplicada é bloqueada.

---

# 83. Critérios de Aceite — Terceiro

- [ ] Morador consegue criar autorização.
- [ ] Autorização está associada à encomenda.
- [ ] Existe validade.
- [ ] Morador consegue cancelar antes do uso.
- [ ] Porteiro consegue consultar.
- [ ] Foto pode ser capturada.
- [ ] Autorização utilizada não pode ser reutilizada.
- [ ] Autorização expirada não funciona.
- [ ] Retirada fica registrada.

---

# 84. Critérios de Aceite — Segurança

- [ ] RLS habilitado.
- [ ] Morador não acessa dados de outros moradores.
- [ ] Porteiro não acessa configurações administrativas.
- [ ] Service Role não está no frontend.
- [ ] Imagens privadas utilizam acesso controlado.
- [ ] Operações críticas são auditadas.
- [ ] CPF não é exposto desnecessariamente.
- [ ] Rotas protegidas possuem autorização real no backend.

---

# 85. MVP — Fase 1

Implementar primeiro:

1. autenticação;
2. condomínio;
3. unidades;
4. moradores;
5. funcionários;
6. permissões;
7. cadastro manual de encomenda;
8. foto;
9. OCR;
10. matching;
11. confirmação;
12. WhatsApp;
13. PWA do morador;
14. pendências;
15. retirada;
16. terceiro autorizado;
17. foto do terceiro;
18. lembretes;
19. dashboards;
20. auditoria.

---

# 86. Fora do MVP

Não implementar inicialmente:

- pagamentos;
- planos;
- assinatura SaaS;
- múltiplos condomínios por administrador;
- lockers inteligentes;
- integração direta com transportadoras;
- biometria facial;
- reconhecimento facial;
- hardware dedicado;
- controle físico de prateleiras.

---

# 87. Evolução Futura

A arquitetura deverá permitir futuramente:

```text
Administradora
   ↓
Condomínios
   ↓
Unidades
   ↓
Moradores
```

Possíveis funcionalidades futuras:

- multi-tenant;
- planos;
- cobrança;
- app nativo;
- lockers;
- QR Code;
- PIN de retirada;
- reconhecimento avançado de etiquetas;
- integrações com transportadoras;
- API pública;
- webhooks;
- relatórios avançados.

---

# 88. Regras Obrigatórias para o OpenCode

Ao implementar este PRD:

1. Não criar funcionalidades fictícias apenas para completar telas.
2. Não utilizar mocks no código de produção.
3. Toda página entregue deverá possuir funcionalidade real.
4. Toda operação deverá utilizar Supabase real.
5. Criar migrations versionadas.
6. Implementar RLS desde o início.
7. Nunca expor Service Role.
8. Nunca expor Evolution API Key.
9. Nunca expor credenciais de IA.
10. Implementar autorização no backend, não somente esconder componentes.
11. Utilizar TypeScript strict.
12. Criar tipos compartilhados.
13. Validar inputs.
14. Sanitizar erros apresentados ao usuário.
15. Registrar erros técnicos separadamente.
16. Criar loading/error/empty states.
17. Não duplicar lógica de negócio em componentes.
18. Centralizar integração Evolution.
19. Centralizar integração OCR/IA.
20. Implementar operações críticas de forma atômica.
21. Implementar idempotência quando necessária.
22. Criar índices adequados.
23. Não executar queries `SELECT *` desnecessárias.
24. Evitar subscriptions Realtime sem necessidade.
25. Comprimir imagens antes do upload quando possível.
26. Utilizar paginação.
27. Evitar downloads repetidos das mesmas imagens.
28. Documentar decisões arquiteturais relevantes.

---

# 89. Definição de Pronto — Definition of Done

Uma funcionalidade somente será considerada pronta quando:

```text
✓ Interface implementada
✓ Responsividade validada
✓ Banco implementado
✓ Migration criada
✓ RLS implementada
✓ Validação implementada
✓ Loading implementado
✓ Empty state implementado
✓ Erros amigáveis implementados
✓ Logs técnicos implementados quando necessário
✓ Permissões testadas
✓ Fluxo principal testado
✓ Sem dados mockados
✓ Sem secrets expostos
```

---

# 90. Resultado Esperado

Ao final do MVP, o condomínio deverá possuir um processo operacional semelhante a:

**1. Receber**

Porteiro fotografa a etiqueta.

**2. Identificar**

IA/OCR extrai os dados e encontra o morador.

**3. Confirmar**

Porteiro valida e registra.

**4. Notificar**

Morador recebe WhatsApp e notificação no aplicativo.

**5. Acompanhar**

A encomenda aparece como aguardando retirada.

**6. Lembrar**

O sistema envia lembretes caso permaneça pendente.

**7. Retirar**

Morador comparece à portaria.

**8. Entregar**

Porteiro confirma a entrega.

**9. Terceiros**

Quando autorizado, terceiro pode retirar mediante registro e fotografia.

**10. Auditar**

Síndico e Super Admin conseguem consultar todo o histórico operacional.

---

# 91. Princípio Central do Produto

O sistema deve transformar o recebimento de uma encomenda em uma operação de poucos segundos:

**Fotografar → Identificar → Confirmar.**

E transformar todo o restante — registro, histórico, notificação, lembretes e auditoria — em processos automáticos.

A experiência do porteiro deve ser extremamente simples, enquanto a arquitetura, segurança e rastreabilidade por trás dessa experiência devem ser robustas.