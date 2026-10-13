# ADR 0014 — Demonstrações 3D próprias geradas com Blender

- Status: proposta
- Data: 2026-10-12
- Responsáveis: Nicolly

## Contexto

O catálogo usa hoje o pacote de GIFs comprado na Hotmart (ADR 0011), depois
restrito a GIF animado (ADR 0012). Dois problemas:

- a licença do pacote não foi verificada para uso comercial ou em software
  (ADR 0011, consequências negativas);
- o visual é de terceiros, sem identidade do Dedic.

Queremos um pacote próprio, com estilo anatômico semelhante ao atual, mas com a
identidade visual do Dedic, e que destaque os grupos musculares trabalhados.
A primeira etapa é a demonstração de cada exercício. A tela de recuperação
muscular (destaque por grupo a partir do histórico) fica para depois.

## Decisão

- **Ferramenta única: Blender**, com script Python executado em modo headless
  para renderizar as demonstrações. Nada de geração por IA para o pack final.
- **Escopo inicial: demonstrações de exercícios.** Cada exercício terá uma
  sequência curta de frames, com o músculo primário destacado.
- **Modelo base**: a origem do corpo ainda não está decidida. Só será usado
  modelo com licença que permita uso comercial e derivados sem obrigação de
  liberar o pack. Modelos CC BY-SA (como o Z-Anatomy e o BodyParts3D) ficam
  de fora por causa do _share-alike_, salvo parecer jurídico em contrário.
- **Animação**: poses e movimentos podem vir de bibliotecas com licença
  verificada (ex.: Mixamo, cujos termos de uso devem ser conferidos antes de
  cada uso). Só os frames renderizados vão para o app; arquivos de origem não
  são redistribuídos.
- **Identidade**: paleta, cor de destaque e fundo vêm dos tokens do design do
  Dedic, não de uma paleta fixa do pacote atual.
- **Entrega**: frames combinados em WebP animado, no mesmo formato e pasta
  (`exercise-media/`) que o catálogo já usa, para que o app não precise mudar
  de contrato.
- **Acessibilidade**: o destaque muscular nunca depende só de cor; o nome do
  músculo aparece em texto ao lado da demonstração.

## Alternativas consideradas

### Pacote atual com apenas revisão de licença

Resolve o risco jurídico se a licença for obtida, mas mantém o visual de
terceiros e não cria identidade própria.

### Gerar as demonstrações com IA de imagem ou vídeo

Rápido para explorar estilo, mas a consistência entre exercícios é baixa e a
anatomia e o destaque muscular saem imprecisos. Pode servir como moodboard,
não como asset final.

### 3D interativo no app (Three.js) desde já

Mais flexível e leve em armazenamento, mas adiciona uma biblioteca 3D na
experiência do aluno antes de haver modelo e identidade definidos. Fica para a
etapa da tela de recuperação muscular.

## Consequências

### Positivas

- Pack com licença clara e identidade do Dedic.
- Renderização reproduzível: mudar a cor ou o ângulo é alterar o script e
  gerar de novo.
- Formato de entrega já suportado pelo app.

### Negativas

- Depende de um modelo base licenciado, que ainda não existe no projeto.
- Produção em Blender exige tempo de modelagem, rigging e ajuste de pose para
  cada exercício.
- O script e as dependências de render passam a fazer parte do repositório e
  precisam de manutenção.

## Validação

- O modelo base tem licença comercial verificada e registrada nesta ADR antes
  de qualquer renderização final.
- Um exercício piloto renderizado de ponta a ponta (script, WebP, upload para
  `exercise-media`, exibição no card e no lightbox) antes de escalar.
- Revisão visual do piloto em celular e desktop, em modo claro e escuro.
- Revisão da ADR quando o modelo base for escolhido ou se a licença do pacote
  atual for resolvida.
