# CLAUDE.md

Diretrizes de comportamento para reduzir erros comuns de LLM em codigo.
Mesclar com instrucoes especificas do projeto quando necessario.

Adaptado de https://github.com/forrestchang/andrej-karpathy-skills,
derivado das observacoes de Andrej Karpathy sobre falhas comuns de LLMs em codigo.

Tradeoff: estas diretrizes priorizam cautela sobre velocidade. Para tarefas triviais,
use bom senso.

---

## 1. Pense Antes de Codar

Nao assuma. Nao esconda confusao. Apresente tradeoffs.

Antes de implementar:

- Declare suposicoes explicitamente. Em caso de incerteza, pergunte.
- Se multiplas interpretacoes existem, apresente-as; nao escolha em silencio.
- Se uma abordagem mais simples existe, diga. Discorde quando justificado.
- Se algo nao esta claro, pare. Nomeie o que confunde. Pergunte.

## 2. Simplicidade Primeiro

Codigo minimo que resolve o problema. Nada especulativo.

- Sem features alem do que foi pedido.
- Sem abstracoes para codigo de uso unico.
- Sem flexibilidade ou configurabilidade que nao foi solicitada.
- Sem tratamento de erro para cenarios impossiveis.
- Se voce escreveu 200 linhas e poderia ser 50, reescreva.

Pergunte-se: "Um engenheiro senior diria que isso esta supercomplicado?"
Se sim, simplifique.

## 3. Mudancas Cirurgicas

Toque apenas no necessario. Limpe apenas a sua propria bagunca.

Ao editar codigo existente:

- Nao melhore codigo adjacente, comentarios ou formatacao.
- Nao refatore o que nao esta quebrado.
- Siga o estilo existente, mesmo que voce faria diferente.
- Se notar dead code nao relacionado, mencione; nao delete.

Quando suas mudancas criam orfaos:

- Remova imports, variaveis e funcoes que SUAS mudancas tornaram inuteis.
- Nao remova dead code preexistente sem pedido explicito.

Teste: cada linha alterada deve rastrear diretamente para o pedido do usuario.

## 4. Execucao Orientada Por Objetivo

Defina criterios de sucesso. Itere ate verificar.

Transforme tarefas em objetivos verificaveis:

- "Adicionar validacao" -> "Escrever testes para inputs invalidos, depois fazer passar".
- "Corrigir o bug" -> "Escrever um teste que reproduz o bug, depois fazer passar".
- "Refatorar X" -> "Garantir que testes passam antes e depois".

Para tarefas multi-step, declare um plano breve:

```text
1. [Passo] -> verificar: [check]
2. [Passo] -> verificar: [check]
3. [Passo] -> verificar: [check]
```

Criterios de sucesso fortes permitem iteracao independente. Criterios fracos
("faca funcionar") exigem clarificacao constante.

---

## 5. Padroes Deste Projeto

Stack: React 18 + Vite + TypeScript strict + Tailwind 3 + shadcn/ui + Tremor
+ Supabase + Zustand + Vitest.

### Sistema De Design

- Botoes: use `Button` de `@/components/ui/button` quando fizer sentido.
  Variantes disponiveis: `default`, `destructive`, `outline`, `secondary`,
  `ghost`, `link`, `neonGradient`, `neonOutline`, `glass`.
- Cores de fundo escuras: prefira tokens `bg-surface-1` a `bg-surface-5`
  quando existirem. Evite novos `bg-[#...]` sem motivo claro.
- Estados de erro/perigo: prefira `border-danger`, `bg-danger`,
  `text-danger-soft`. Nao use hex direto para perigo.
- Estados disabled: prefira o comportamento padrao do componente. Evite
  `disabled:opacity-*` ad-hoc quando o componente ja cobre o estado.
- Tokens semanticos (`bg-primary`, `text-foreground`, `border`, `ring`) estao
  em `src/index.css` e `tailwind.config.js`. Alterar esses tokens afeta o tema
  inteiro; planeje antes.

### Pontos Sensiveis

- `src/components/FlowIntel.tsx` tem 2.100+ linhas. Mudancas nele sao caras;
  isole o escopo e evite refatoracao junto com feature.
- `src/lib/api/analytics.ts` e `src/lib/api/users.ts` ainda possuem alguns
  `any` em queries Supabase. Nao introduza novos `any`; se for tipar, faca uma
  refatoracao pequena e verificavel.
- Avatares com `alt=""` em `AccountPage.tsx` e `home/HomeTopbar.tsx` podem ser
  decorativos. Nao altere sem revisar o contexto visual/acessibilidade.

### Convencoes

- Path absoluto: `@/*` aponta para `src/*`. Evite paths relativos longos.
- TypeScript esta em modo strict. Evite `any`; use tipos do Supabase quando
  disponiveis.
- Tailwind: prefira tokens semanticos (`primary`, `accent`, `muted`,
  `surface-*`, `danger`) sobre paleta generica quando representar conceito do
  design system.
- Use `cn(...)` de `@/lib/utils` para compor classes.

## 6. Comandos

```bash
npm run dev
npm run build
npm test
npm run typecheck:api
```

Ao concluir uma mudanca nao trivial, rode pelo menos `npm run build` e
`npm test`, salvo se a mudanca for apenas documentacao/instrucoes.

---

Estas diretrizes estao funcionando se houver menos mudancas desnecessarias em
diffs, menos reescritas por supercomplicacao e perguntas de clarificacao antes
da implementacao, nao depois dos erros.
