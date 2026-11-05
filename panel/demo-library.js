/* Demonstration collection. Video metadata checked 2026-10-23 on the creator's
   YouTube pages. Embedded links only; no ownership or open-content license claimed.
   Keep stable IDs so saved demo plans remain readable. No patient data or network. */
const DEMO_EXERCISES = [
  {id:'demo-e3-bridge',name:'Mostek biodrowy',area:'Kolano',title:'Bridge',yt:'_bCmHW_mLCU',equipment:'Mata',goal:'Przykład ruchu bioder w leżeniu.'},
  {id:'demo-e3-heel',name:'Wspięcia na palce',area:'Staw skokowy',title:'Heel Raise',yt:'zvZp4FJjME4',equipment:'Stabilne podparcie',goal:'Przykład ruchu stawu skokowego w staniu.'},
  {id:'demo-e3-bird',name:'Bird dog — ruch naprzemienny',area:'Kręgosłup',title:'Bird Dog',yt:'egKWoMZ6cXM',equipment:'Mata',goal:'Przykład ruchu kończyn w klęku podpartym.'},
  {id:'demo-e3-bird-hold',name:'Bird dog — zatrzymanie pozycji',area:'Kręgosłup',title:'Bird Dog Isometric',yt:'o-tFb_fvsHo',equipment:'Mata',goal:'Przykład wariantu z utrzymaniem pozycji.'}
].map(e=>({...e,demo:true,video:`https://www.youtube.com/watch?v=${e.yt}`,
  videoLabel:`E3 Rehab Exercise Library · ${e.title}`,sourceChecked:'2026-10-23',
  dosage:'DEMO — dawkowanie do ustalenia',
  steps:['Otwórz film źródłowy, aby obejrzeć przykład ruchu.','W planie możesz edytować dawkowanie i własne wskazówki.'],
  contra:'Materiał pokazowy interfejsu. Dobór ćwiczenia, technikę i dawkowanie musi zatwierdzić fizjoterapeuta.'}));
EXERCISES.unshift(...DEMO_EXERCISES);
const DEMO_SETS = [
  {name:'Ruch na macie',description:'Mostek i dwa warianty bird dog. Przykład organizacji zestawu, bez protokołu leczenia.',ids:['demo-e3-bridge','demo-e3-bird','demo-e3-bird-hold']},
  {name:'Dwie pozycje wyjściowe',description:'Leżenie i stanie. Krótki zestaw do sprawdzenia edycji oraz podglądu planu.',ids:['demo-e3-bridge','demo-e3-heel']}
];
