/* Regressão contextual: notas SOS 777, shutdown 6030 e retenção de linhas piloto. */
'use strict';
const assert=require('node:assert/strict');
const parser=require('../js/parser.js');
const oil=`TEXTO BREVE:
SOS-RODA DIANT DIR - POEIRA/LIMALHAS

Relatório U330-56279-2554
Amostra 09/09/2026
Análise 09/10/2026
A análise apresentou Silício e Alumínio, Ferro e limalhas ferrosas na Roda Dianteira Direita.

HISTÓRICO S·O·S.:
18/03/2026: Registro anterior da condição.
13/04/2026 – Relatório U330-56118-2108:
Silício e Alumínio associados à elevação de Ferro.
12/05/2026 – Relatório U330-56153-2124:
Nova ocorrência.
Para esta condição foi criada a Nota 10043865 / OS 4043304.
03/07/2026 – Relatório U330-56202-2211:
Reincidência.
A Nota 10050069 / OS 4049544 foi aberta posteriormente.

LEITURA DA ENGENHARIA:
A investigação deverá distinguir contaminação de coleta, preventiva, vedação e desgaste interno.

RECOMENDAÇÃO DA ENGENHARIA:
Atualizar e executar a OS 4049544.
Inspecionar externamente a Roda Dianteira Direita.
Remover a tampa 6G-6247 conforme procedimento Caterpillar;
Remover e substituir o O-ring 8J-8879.
Realizar duas coletas antes de drenagem.
Registrar fotografias internas.

COLETA DE AMOSTRAS:
1. S·O·S.:
1Z0101 / Kit Coleta S·O·S. / 1
2. Engenharia:
Ampola avulsa sem rótulo / 1
Identificar a ampola da Engenharia com:
TAG: 040-012
COMPONENTE: RODA DIANTEIRA DIREITA
DATA
HORÍMETRO
ENGENHARIA
Não utilizar um segundo kit 1Z0101 para a amostra da Engenharia.

TIPO DE SERVIÇO:
Inspeção externa e interna + coleta de amostras + troca de óleo.

MATERIAL NECESSÁRIO:
1Z0101 / Kit Coleta S·O·S. com análise laboratorial / 1
Ampola avulsa sem rótulo / Coleta Engenharia - contador de partículas / 1
8J-8879 / Anel Retentor em O da tampa da roda dianteira / 1
Óleo da Roda Dianteira Direita / especificação e quantidade conforme SIS ou plano de lubrificação do equipamento

MÃO DE OBRA ESTIMADA:
Mecânico: 3h
Lubrificador: 2h`;
const a=parser.parse(oil);
assert.equal(a.parts.length,4,JSON.stringify(a.parts,null,2));
assert.deepEqual(a.parts.filter(p=>p.pn==='1Z0101').map(p=>p.quantity),[1]);
assert.equal(a.duplicates.length,2); // Kit e ampola aparecem tanto na coleta quanto na lista.
assert.ok(a.parts.some(p=>p.pn==='8J-8879'));
assert.ok(!a.parts.some(p=>p.pn==='6G-6247'),'PN citado em instrução não implica material');
assert.ok(a.parts.every(p=>!p.pn.startsWith('U330')),'Identificadores de relatório não são PN');
assert.ok(a.parts.some(p=>p.pn==='PN A CONFIRMAR'&&p.description.startsWith('Óleo')&&p.quantity===''));
assert.ok(a.parts.some(p=>p.pn==='PN A CONFIRMAR'&&p.description.startsWith('Ampola')&&p.quantity===1));
assert.equal(a.labor.length,2,JSON.stringify(a.labor));
assert.deepEqual(a.labor.map(l=>[l.role,l.count,l.hours]),[['Mecânico',1,3],['Lubrificador',1,2]]);
assert.equal(a.totalHH,5);
assert.equal(a.duration,null);
assert.match(a.failure,/Silício e Alumínio/);
assert.match(a.failure,/HISTÓRICO/);
assert.match(a.work,/Inspecionar externamente/);
assert.ok(!a.work.includes('Relatório U330-'));
assert.ok(a.warnings.some(x=>x.includes('sem quantidade')));

const reportHeavy=`TEXTO BREVE:
SOS-RODA DIANT DIR - POEIRA/LIMALHAS
HISTÓRICO S·O·S.:
13/04/2026 – Relatório U330-56118-2108:
12/05/2026 – Relatório U330-56153-2124:
07/06/2026 – Relatório U330-56188-2026:
03/07/2026 – Relatório U330-56202-2211:
23/08/2026 – Relatório U330-56265-2114:
09/09/2026 – Relatório U330-56279-2554:
HISTÓRICO DE MANUTENÇÃO RELEVANTE:
OS 4044898 – BL-VAZAMENTO PELO RETENTOR DUO-CONE pertence ao comando final L/E.
MATERIAL NECESSÁRIO:
1Z0101 / Kit Coleta S·O·S. / 1
8J-8879 / O-ring da roda / 1
MÃO DE OBRA ESTIMADA:
Mecânico: 3h
Lubrificador: 2h`;
const b=parser.parse(reportHeavy);
assert.equal(b.parts.length,2,JSON.stringify(b.parts));
assert.equal(b.labor.length,2);
assert.match(b.failure,/HISTÓRICO DE MANUTENÇÃO/);

const cat6030=`## Descrição longa
**CONDIÇÃO ENCONTRADA:**
Identificados via VisionLink eventos simultâneos associados ao shutdown dos motores do CAT 6030:
E.C. 2524 – LH Engine Shutdown Active
Data: 05/08/2026 02:20:44
Horímetro: 17.800,28 h
E.C. 3524 – RH Engine Shutdown Active
E.C. 2920 – LH Shutoff Valve Hydraulic Tank Upper
Conforme literatura Caterpillar M0124131-04, evento associado ao proximity -3B19 da Central Gate Valve.
**ATIVIDADE RECOMENDADA:**
1. Confirmar se a Central Gate Valve está totalmente aberta.
2. Verificar posicionamento e distância entre manopla e proximity switch **-3B19**.
3. Consultar o BCS Fault Storage II e registrar os códigos 2920, 2524 e 3524.
**EVIDÊNCIAS OBRIGATÓRIAS:**
- fotografia da válvula totalmente aberta;
- resultados das medições elétricas;
**OBSERVAÇÃO DE ENGENHARIA:**
Não abrir notas independentes para eventos 2524 e 3524.
## Recursos iniciais
Eu colocaria:
**1 Mecânico / 2 h**
**1 Eletricista / 2 h**
Tempo estimado: **2 h**, trabalhando em conjunto.`;
const c=parser.parse(cat6030);
assert.equal(c.parts.length,0,JSON.stringify(c.parts));
assert.deepEqual(c.labor.map(l=>[l.role,l.count,l.hours]),[['Mecânico',1,2],['Eletricista',1,2]]);
assert.equal(c.duration,2);
assert.equal(c.totalHH,4);
assert.match(c.failure,/VisionLink/);
assert.match(c.work,/proximity switch/);
assert.match(c.work,/EVIDÊNCIAS OBRIGATÓRIAS/);

const pilots=`Descrição breve:
BL-Corrigir suporte das linhas piloto
O que falhou?
Suporte/retenção das linhas piloto com montagem improvisada.
Por que falhou?
Provável remoção dos componentes originais.
Intervenção sugerida:
Remover adaptação e restabelecer configuração original.
Peças necessárias:
370-6141 / Grampo (Slot) / 1
370-6142 / Grampo (Tab) / 1
370-6219 / Ilhó / 2
8T-4139 / Parafuso / 2
8T-4223 / Arruela Dura / 2
Referência técnica condicional:
602-9964 / Conjunto de Suporte / 1
(utilizar somente se for constatado em campo dano ou ausência do suporte-base original)
Previsão de mão-de-obra:
1 mecânico / 1 hora`;
const d=parser.parse(pilots);
assert.equal(d.parts.length,6,JSON.stringify(d.parts));
assert.equal(d.parts.filter(p=>p.conditional).length,1);
const optional=d.parts.find(p=>p.pn==='602-9964');
assert.ok(optional);
assert.match(optional.mechanicComment,/utilizar somente/);
assert.equal(d.labor.length,1);
assert.deepEqual([d.labor[0].count,d.labor[0].hours],[1,1]);
assert.equal(d.duration,null);
assert.match(d.failure,/montagem improvisada/);
assert.match(d.work,/restabelecer configuração/);

const more=[
 ['Mecânico:3h',1,3],
 ['Lubrificador: 2h',1,2],
 ['Mecânicos: 2',2,null],
 ['2 mecânicos / 4 horas',2,4],
 ['Mão-de-obra: 1 eletricista 2 horas',1,2]
];
for(const [raw,count,hours] of more){const x=parser.parseLabor(raw,'labor');assert.equal(x.length,1,raw);assert.deepEqual([x[0].count,x[0].hours],[count,hours],raw);}
assert.equal(parser.parsePart('13/04/2026 – Relatório U330-56118-2108:','failure'),null);
assert.equal(parser.parsePart('Remover a tampa 6G-6247 conforme procedimento Caterpillar','work'),null);
console.log('OK — 4 cenários reais SOS/CAT, materiais condicionais, equipe e exclusão de identificadores de relatório.');
