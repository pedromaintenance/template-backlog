# GMIN · Instruções de Trabalho (Mina Tocantinzinho)

Editor estático **offline-first** de documentação de apoio às ordens de serviço de manutenção. Complementa o SAP PM: não o substitui. Reaproveita o editor de evidências do [Relatório de Inspeção](https://github.com/pedromaintenance/relatorio-de-inspecao), sob licença MIT.

## Formulário de Instrução de Trabalho

1. **Cabeçalho:** título da OS, TAG, modelo, número da Nota, número da Ordem, prioridade P0–P3, duração prevista, autor e data.
2. **Equipe:** especialidade, quantidade de profissionais e horas por profissional. **Duração da intervenção ≠ HH**: dois mecânicos × duas horas = quatro HH, mesmo que o serviço dure duas horas.
3. **Escopo:** descrição da condição/falha, comando do serviço e cuidados/referências técnicas.
4. **Materiais:** Part Number como TEXTO (preserva zeros iniciais), descrição, quantidade, orientação ao mecânico, e, separadamente, MRP, MIN, MAX e comentários internos de planejamento.
5. **Evidências:** blocos rearranjáveis por alça de **texto, lista, fotografia ou avaliação**. A avaliação comporta OK/Não OK, severidade, comentários e fotos. Fotografias por câmera/galeria, legendas, miniaturas e compactação local.
6. **Persistência:** IndexedDB separado do Relatório de Inspeção. Backup/restauração de JSON editável, incluindo fotos.

## Versões de exportação

| Conteúdo | Planejador | Mecânico |
| --- | --- | --- |
| Cabeçalho, equipe e duração | Sim | Sim |
| Instrução, condição, cuidados | Sim | Sim |
| PN, descrição e quantidade | Sim | Sim |
| Orientações de execução por peça | Sim | Sim |
| MRP, MIN, MAX, comentários internos e notas PCM | Sim | **Não** |
| Evidências, fotos, listas e avaliações | Sim | Sim |
| PDF pela impressão do navegador | Sim | Sim |
| Word DOCX, Excel XLSX, JSON | Sim | Não expostos ao mecânico |

Os comentários de **planejamento** e de **execução** são campos separados do modelo de dados. A impressão do mecânico é gerada sem informações internas do PCM, MRP, MIN ou MAX. O backup JSON do planejador **contém todos os dados**, portanto não deve ser compartilhado como a instrução simplificada para a oficina.

DOCX e XLSX são produzidos localmente, com fotografias embutidas, sem serviços externos.

## Importação inteligente de descrições longas

Use **Interpretar texto de nota/OS → Analisar texto → Revisar prévia → Aplicar após revisão**. As heurísticas são determinísticas, executadas no navegador, sem IA remota. Linhas não identificadas são **preservadas na instrução**; casos de classificação incompleta são alertados.

Exemplos:

~~~text
CONDIÇÃO ENCONTRADA:
Vazamento na linha de avanço.
MATERIAIS PREVISTOS:
BG01155919 | Cartridge Counter Balance | 4
123-1234 - Parafuso - 02und
2 arruelas / 026044-001
TST-26-0229 | Kit manta térmica | 3
123414151545, Porca, 2
MÃO DE OBRA:
2 mecânicos / 1 hora
1 eletricista 2 horas
Duração total: 2 horas
ATIVIDADE RECOMENDADA:
Substituir componentes e verificar estanqueidade.
~~~

São aceitos separadores `-` (com espaços), `/`, `|`, vírgula, ponto-e-vírgula e tabulação; quantidade antes ou depois, com `qtd`, `und`, `un`, `pcs`, `x` etc. Reconhece PN com hífen, longos códigos numéricos e alfanuméricos, além de diferentes grafias de especialidades.

**Importante:** o importador não valida PN no catálogo OEM ou SAP. Confira códigos, quantidades e estimativas após importar. **Horas de mão de obra não definem automaticamente a duração da parada.** Se a duração total não estiver explícita, ela permanece em branco.

## Arquivos e testes

~~~text
index.html
css/styles.css
js/app.js                  Editor de formulário e blocos de evidência
js/parser.js               Heurísticas de interpretação
js/exports.js              Documentos PDF, DOCX, XLSX e JSON
js/storage.js              IndexedDB
js/zip.js                  Gerador ZIP local para Office
js/logo-data.js            Logomarca corporativa embutida offline
assets/icon.svg
assets/icon-192.png
assets/icon-512.png
manifest.webmanifest
service-worker.js
tests/test_app.cjs
.github/workflows/ci.yml
~~~

O aplicativo não necessita de build nem dependências de produção. Para testar:

~~~bash
python -m http.server 8000
# Abra http://localhost:8000
node tests/test_app.cjs
~~~

O GitHub Actions verifica sintaxe e regressão a cada push ou Pull Request. Para disponibilizar no **GitHub Pages**, após o merge configure *Settings → Pages → Deploy from branch → main / root*. PWA e cache offline dependem de HTTPS ou localhost e de critérios do navegador.

## Governança e segurança

- O **SAP PM continua sendo a fonte oficial** de Notas, Ordens, status, prioridade e aprovisionamento. A IT é um documento auxiliar e não gera Ordens SAP.
- **Nunca publique no repositório público** fotos internas, relatórios reais, dados de empregados, PR/PO e documentos sensíveis. Os dados do editor ficam no dispositivo e o JSON de backup contém fotografias e notas internas do PCM, sem criptografia própria.
- Confirme as prioridades P0–P3 conforme matriz vigente do site. Nenhuma instrução substitui análise de risco, bloqueio, procedimentos OEM ou autorização de liberação.
- Câmera, impressão, instalação e paginação de documentos extensos devem ser conferidas no dispositivo real. Fotografias são compactadas; preserve o original quando necessário.

Próxima evolução: refinar as heurísticas com exemplos reais de descrições de notas e ordens, preservando sempre a revisão humana.


## Interpretador contextual v2 — exemplos de campo

O analisador foi revisado com **notas reais de S·O·S. da roda dianteira, códigos de falha CAT 6030 e manutenção das linhas piloto**. A análise ocorre inteiramente no navegador, sem envio de dados.

A classificação agora usa primeiro as seções da descrição longa:

- **Condição / histórico:** TEXTO BREVE, CONDIÇÃO ENCONTRADA, HISTÓRICO S·O·S., HISTÓRICO DE MANUTENÇÃO, LEITURA DA ENGENHARIA, O QUE FALHOU?, POR QUE FALHOU?
- **Serviço:** ATIVIDADE RECOMENDADA, RECOMENDAÇÃO DA ENGENHARIA, INTERVENÇÃO SUGERIDA, COLETA DE AMOSTRAS, EVIDÊNCIAS OBRIGATÓRIAS, CRITÉRIO PARA PRÓXIMA TRATATIVA, OBSERVAÇÕES e TIPO DE SERVIÇO.
- **Peças:** MATERIAIS PREVISTOS, MATERIAL NECESSÁRIO, PEÇAS NECESSÁRIAS. Também reconhece linhas estruturadas de peças na seção de coleta de amostras.
- **Material condicional:** REFERÊNCIA TÉCNICA CONDICIONAL; o item é marcado como condicional e sua justificativa é preservada.
- **Mão de obra:** MÃO DE OBRA ESTIMADA, PREVISÃO DE MÃO-DE-OBRA, RECURSOS INICIAIS, além de linhas com quantidade e especialidade.

**Casos agora tratados:** `Mecânico: 3h` significa **1 mecânico, 3 h**, não 3 mecânicos. `Mecânicos: 2` significa dois profissionais, ainda sem duração. Relatórios `U330-56279-2554`, números de notas/OS e referências técnicas citadas durante uma atividade não são automaticamente peças. `1Z0101` repetido na descrição da coleta e na lista principal é consolidado **sem dobrar a quantidade**. Materiais sem PN ou sem quantidade explícita, como óleo a definir pelo SIS, são preservados com alerta de conferência. Se a mesma nota for importada novamente com “Adicionar”, os itens já existentes são preservados, inclusive anotações MIN/MAX/MRP.

A prévia permite conferir separadamente **condição encontrada/histórico** e **comando do serviço**, e editar manualmente PN, descrição, quantidade, mão de obra, duração e indicação de material condicional antes de aplicar.

**Limitações:** as heurísticas não verificam o catálogo OEM ou a disponibilidade real no SAP. A quantidade de óleo, a elegibilidade de uma peça condicional e o diagnóstico final devem ser confirmados pelo planejador e pela equipe de campo. Os testes cobrem exemplos fornecidos, não todos os formatos possíveis de descrição longa.

Para executar também as regressões de campo:
~~~bash
node tests/test_real_notes.cjs
~~~
