# Como contribuir

Regras de trabalho do time. Valem para todo mundo e para todo PR. O subject avalia os commits de cada pessoa, a clareza das mensagens e a divisão do trabalho.

## Fluxo

1. **Pegue uma issue** no [Project](https://github.com/orgs/42SP-Transcendence/projects/1). Escolha uma que não tenha bloqueio aberto, atribua a issue a você e mova para **In Progress**.
2. **Crie uma branch** a partir da `main` atualizada:
   ```bash
   git switch main && git pull
   git switch -c feat/24-collection-scheduler
   ```
3. **Faça commits pequenos**, seguindo o padrão abaixo.
4. **Abra o PR** quando a issue estiver pronta. Ele precisa de CI verde e **1 aprovação** de outra pessoa do time.
5. **Faça o merge você mesmo**, depois da aprovação, sempre com **squash**. Apague a branch em seguida.
6. A issue fecha sozinha pelo `Closes #N` e vai para **Done** no Project.

Ninguém faz push direto na `main`.

## Branches

Formato: `tipo/número-da-issue-descrição-curta`, com a descrição em inglês e em kebab-case.

| Exemplo                   | Quando usar         |
| ------------------------- | ------------------- |
| `feat/20-gtfs-import`     | Funcionalidade nova |
| `fix/31-login-redirect`   | Correção de bug     |
| `docs/8-database-diagram` | Só documentação     |
| `ci/2-github-actions`     | CI e automação      |

Uma branch por issue. Se a issue for grande demais para um PR, divida a issue antes.

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/). O tipo e o escopo ficam em inglês e a descrição em português:

```
tipo(escopo): descrição curta em minúsculas, sem ponto final
```

| Tipo       | Uso                                                |
| ---------- | -------------------------------------------------- |
| `feat`     | Funcionalidade nova                                |
| `fix`      | Correção de bug                                    |
| `docs`     | Documentação                                       |
| `refactor` | Mudança de código sem mudar comportamento          |
| `test`     | Testes                                             |
| `ci`       | CI e automação                                     |
| `chore`    | Configuração, dependências e tarefas de manutenção |

O escopo é a pasta que muda: `api`, `web`, `collector`, `core`, `database`, `schemas`, `ui`, `config` ou `infra`. Quando a mudança atravessa várias, deixe sem escopo.

Exemplos que já estão na `main`:

```
feat(collector): import do GTFS com validação e relatório
feat(database): contagens nas faixas horárias e suspensão de conta
docs: diagrama do schema do banco no README
```

O hook de pre-commit roda o Prettier nos arquivos alterados. Não use `--no-verify`.

## Pull requests

- **Título:** no mesmo formato do commit, porque ele vira a mensagem do squash na `main`.
- **Descrição:** siga o template. Comece com `Closes #N` e explique o que muda, como testar e o que você verificou.
- **Tamanho:** um PR por issue, o menor possível. PR pequeno é revisado mais rápido.
- **Antes de pedir revisão**, rode na raiz:
  ```bash
  pnpm format:check
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm knip
  ```
- **CI:** o mesmo conjunto roda no GitHub Actions. PR com CI vermelho não é mergeado.

## Revisão

- **1 aprovação** de outra pessoa do time é suficiente.
- **Quem revisa confere:** se o PR resolve a issue, se o código respeita as camadas da arquitetura (`domain` não importa Nest nem Prisma), se há testes para o que mudou e se nenhum segredo entrou no código.
- **Comentários:** quem revisa pede mudanças com comentários; quem abriu responde e marca a conversa como resolvida.
- **Mudanças de arquitetura** (camadas, banco, dependências novas) passam também pelo Tech Lead.

## Segredos

- **Tokens e senhas** ficam só no `.env`, que está no `.gitignore`. Nunca em código, fixture, log, issue ou PR.
- **Token da Olho Vivo:** cada pessoa usa o próprio, em `SPTRANS_API_TOKEN`. A SPTrans leva de 1 a 2 dias para liberar um token novo.
- **Se um segredo vazar**, avise o time e gere outro. Apagar o commit não basta.
