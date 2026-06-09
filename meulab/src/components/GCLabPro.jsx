import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Lightbulb, ClipboardCheck, Rocket, UploadCloud, Link, Users, Eye, MessageSquareQuote, ShieldCheck, FolderPlus, ArrowLeft, CheckCircle, Clock, History, FileText, Award, X, Settings, BrainCircuit } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDocs, query, orderBy, getDoc, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import uniaraLogo from '../assets/uniaralogo.jpg';
import gbxLogo from '../assets/gbxlogo.jpg';

export default function GCLabPro() {
  const [step, setStep] = useState(1);
  const [docId, setDocId] = useState(null);
  const [tempAluno, setTempAluno] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // ESTADOS DO PAINEL DO PROFESSOR
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [atividades, setAtividades] = useState([]);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);
  const [projetosRemotos, setProjetosRemotos] = useState([]);
  const [projetosFiltrados, setProjetosFiltrados] = useState([]);
  
  // ESTADOS DE VISUALIZAÇÃO E AVALIAÇÃO (A CORREÇÃO DO ACESSO)
  const [projetoEmVisualizacao, setProjetoVisualizacao] = useState(null);
  const [alunoSelecionadoProva, setAlunoSelecionadoProva] = useState("");

  // Formulário para criar atividade com PESOS
  const [novaAtivNome, setNovaAtivNome] = useState("");
  const [novaAtivTurma, setNovaAtivTurma] = useState("");
  const [novaAtivNotaMax, setNovaAtivNotaMax] = useState("10");
  const [pesoDiag, setPesoDiag] = useState("30");
  const [pesoRoad, setPesoRoad] = useState("40");
  const [pesoFiltro, setPesoFiltro] = useState("30");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedbackConselho, setFeedbackConselho] = useState("");
  const [isIAWait, setIsIAWait] = useState(false);
  const [isIAProfWait, setIsIAProfWait] = useState(false);
  const [isProvaWait, setIsProvaWait] = useState(false); 

  const [formData, setFormData] = useState({
    atividadeId: '', nomeGrupo: '', empresa: '', area: '', alunos: [],
    qPessoasSaida: '', qPessoasErro: '', diagPessoasTags: [], diagPessoasObs: '',
    qProcessosTreinamento: '', qProcessosAtualizacao: '', diagProcessosTags: [], diagProcessosObs: '',
    qTecnologiaBusca: '', qTecnologiaSilos: '', diagTecnologiaTags: [], diagTecnologiaObs: '',
    nivelMaturidade: '1', gapPrincipal: '', impactoNegocio: '',
    f1Patrocinador: '', f1AcaoEngajamento: '', f2Ferramenta: '', f2ResponsavelTI: '',
    f3SetorPiloto: '', f3CriterioSucesso: '', f4NovaRotina: '', f4DonoProcesso: '',
    chkOrcamento: false, justOrcamento: '', chkTempo: false, justTempo: '', chkManutencao: false, justManutencao: '',
    evidencias: [], feedbackIA: '', avaliacaoProfessorIA: '', provaProfessorIA: '', 
    notaFinal: '', etapaConcluida: 1
  });

  const presets = {
    pessoas: ["Resistência", "Heróis do Conhecimento", "Falta de tempo", "Cultura de punição", "Alta rotatividade"],
    processos: ["Onboarding informal", "Manuais desatualizados", "Depende de memória", "Retrabalho", "Sem lições aprendidas"],
    tecnologia: ["Silos no WhatsApp", "Sistemas difíceis", "Sem base central", "Busca ineficiente", "Muitas planilhas"]
  };

  const inputStyle = "w-full p-3 border-4 border-black bg-white focus:bg-yellow-100 outline-none shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all font-bold text-black text-sm";
  const btnBrutal = "px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 text-xs md:text-sm cursor-pointer";

  const buscarAtividadesPublicas = async () => {
    try {
      const qAct = query(collection(db, "atividades_gc"), orderBy("createdAt", "desc"));
      const snapAct = await getDocs(qAct);
      setAtividades(snapAct.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Erro", e); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const act = params.get('act');
    if (id) carregarProjetoPeloId(id);
    if (act) setFormData(prev => ({ ...prev, atividadeId: act }));
    buscarAtividadesPublicas();
  }, []);

  const carregarProjetoPeloId = async (idDigitado) => {
    if (!idDigitado) return;
    const cleanId = idDigitado.includes('?id=') ? idDigitado.split('?id=')[1].split('&')[0].trim() : idDigitado.trim();
    try {
      const docRef = doc(db, "projetos_gc", cleanId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.evidencias) data.evidencias = [];
        if (!data.etapaConcluida) data.etapaConcluida = 1;
        setFormData(data);
        setDocId(docSnap.id);
        setStep(data.etapaConcluida);
        if(data.feedbackIA) setFeedbackConselho(data.feedbackIA);
        window.history.replaceState(null, '', `?id=${docSnap.id}`);
      } else { alert("Projeto não encontrado!"); }
    } catch (e) { console.error(e); }
  };

  const salvarNoFirebase = async (proximoPasso) => {
    if (!formData.atividadeId && !docId) { alert("Escolha a atividade antes de iniciar."); return; }
    setIsSaving(true);
    try {
      const etapaAtual = formData.etapaConcluida || 1;
      const novaEtapa = proximoPasso > etapaAtual ? proximoPasso : etapaAtual;
      const payload = { ...formData, etapaConcluida: novaEtapa, updatedAt: serverTimestamp() };
      if (!docId) {
        const docRef = await addDoc(collection(db, "projetos_gc"), { ...payload, createdAt: serverTimestamp() });
        setDocId(docRef.id);
        window.history.replaceState(null, '', `?id=${docRef.id}`);
      } else {
        await updateDoc(doc(db, "projetos_gc", docId), payload);
      }
      if (proximoPasso) setStep(proximoPasso);
    } catch (e) { console.error(e); }
    setIsSaving(false);
  };

  const criarNovaAtividade = async (e) => {
    e.preventDefault();
    if(!novaAtivNome || !novaAtivTurma) return;
    
    const somaPesos = parseInt(pesoDiag) + parseInt(pesoRoad) + parseInt(pesoFiltro);
    if(somaPesos !== 100) {
      alert(`A soma dos pesos deve ser exatamente 100%. Atualmente está em ${somaPesos}%.`);
      return;
    }

    try {
      await addDoc(collection(db, "atividades_gc"), {
        nome: novaAtivNome, turma: novaAtivTurma, notaMaxima: novaAtivNotaMax,
        pesos: { diagnostico: pesoDiag, roadmap: pesoRoad, filtro: pesoFiltro },
        createdAt: serverTimestamp()
      });
      setNovaAtivNome(""); setNovaAtivTurma(""); buscarAtividadesPublicas(); 
      alert("Atividade Parametrizada e Criada!");
    } catch (e) { console.error(e); }
  };

  const carregarAtividadesDoBanco = async () => {
    if (!isAdminAuth) {
      const senha = prompt("Senha Master:");
      if (senha !== "uniara2024") return;
      setIsAdminAuth(true);
    }
    await buscarAtividadesPublicas(); 
    const qProj = query(collection(db, "projetos_gc"), orderBy("createdAt", "desc"));
    const snapProj = await getDocs(qProj);
    setProjetosRemotos(snapProj.docs.map(d => ({ id: d.id, ...d.data() })));
    setShowAdmin(true);
  };

  const selecionarAtividadeDashboard = async (ativ) => {
    setAtividadeSelecionada(ativ);
    const q = query(collection(db, "projetos_gc"), where("atividadeId", "==", ativ.id));
    const snap = await getDocs(q);
    setProjetosFiltrados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const salvarNotaProfessor = async (pId, nota) => {
    try {
      await updateDoc(doc(db, "projetos_gc", pId), { notaFinal: nota });
      setProjetosFiltrados(projetosFiltrados.map(p => p.id === pId ? { ...p, notaFinal: nota } : p));
      setProjetosRemotos(projetosRemotos.map(p => p.id === pId ? { ...p, notaFinal: nota } : p));
      
      // Se o modal estiver aberto, atualiza ele também
      if(projetoEmVisualizacao && projetoEmVisualizacao.id === pId) {
         setProjetoVisualizacao(prev => ({ ...prev, notaFinal: nota }));
      }
    } catch (e) { alert("Erro ao salvar nota"); }
  };

  const excluirAtividadeCompleta = async (aId) => {
    if(window.confirm("Apagar a atividade removerá o acesso ao dashboard dela. Continuar?")) {
      await deleteDoc(doc(db, "atividades_gc", aId));
      setAtividades(atividades.filter(a => a.id !== aId));
      if(atividadeSelecionada?.id === aId) setAtividadeSelecionada(null);
    }
  };

  const excluirProjetoDoDashboard = async (pId) => {
    if(window.confirm("Deseja apagar esse grupo?")) {
      await deleteDoc(doc(db, "projetos_gc", pId));
      setProjetosFiltrados(projetosFiltrados.filter(p => p.id !== pId));
      setProjetosRemotos(projetosRemotos.filter(p => p.id !== pId));
    }
  };

  const validarComConselho = async () => {
    setIsIAWait(true);
    const prompt = `Analise criticamente: Problema: ${formData.gapPrincipal}. Solução: Engajamento (${formData.f1AcaoEngajamento}), TI (${formData.f2Ferramenta}), Piloto (${formData.f3SetorPiloto}). Retorne 3 perguntas socráticas duras sobre a viabilidade prática.`;
    try {
      const response = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      const textoIA = data.candidates[0].content.parts[0].text;
      setFeedbackConselho(textoIA);
      setFormData(prev => ({ ...prev, feedbackIA: textoIA }));
      if(docId) await updateDoc(doc(db, "projetos_gc", docId), { feedbackIA: textoIA });
    } catch (e) { setFeedbackConselho("Erro de conexão com o Conselho."); }
    setIsIAWait(false);
  };

  // A MÁGICA: AUTO-AVALIAÇÃO COM NOTA AUTOMÁTICA
  const autoAvaliarAtribuirNota = async (projeto) => {
    setIsIAProfWait(true);
    
    // Puxa os pesos da atividade selecionada (ou define padrão se for projeto antigo)
    const ativ = atividades.find(a => a.id === projeto.atividadeId);
    const notaMax = ativ?.notaMaxima || 10;
    const pesos = ativ?.pesos || { diagnostico: 30, roadmap: 40, filtro: 30 };

    const prompt = `Você é um sistema de avaliação automática e rigorosa. Avalie o projeto deste grupo de Gestão do Conhecimento considerando os seguintes pesos configurados pelo professor:
    - Diagnóstico do Problema (Peso ${pesos.diagnostico}%): "${projeto.gapPrincipal}"
    - Roadmap e Solução (Peso ${pesos.roadmap}%): "${projeto.f1AcaoEngajamento}" e "${projeto.f2Ferramenta}"
    - Defesa / Filtro de Realidade (Peso ${pesos.filtro}%): Orçamento (${projeto.justOrcamento}) e Tempo (${projeto.justTempo}).

    A Nota Máxima possível desta atividade é ${notaMax}. Seja justo, porém crítico. 

    FORMA DE RESPOSTA OBRIGATÓRIA:
    Escreva um breve dossiê (2 parágrafos) justificando os pontos fortes e os descontos de nota.
    No final da sua resposta, pule uma linha e escreva EXATAMENTE o seguinte formato para eu extrair a nota via sistema:
    NOTA_FINAL_SISTEMA: [Apenas o número final calculado, ex: 8.5]`;

    try {
      const response = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      const textoIA = data.candidates[0].content.parts[0].text;
      
      // Extraindo a nota da resposta da IA
      let notaExtraida = "";
      if (textoIA.includes("NOTA_FINAL_SISTEMA:")) {
         notaExtraida = textoIA.split("NOTA_FINAL_SISTEMA:")[1].trim().replace(",", ".");
      }

      // Atualiza o banco de dados
      await updateDoc(doc(db, "projetos_gc", projeto.id), { 
        avaliacaoProfessorIA: textoIA.split("NOTA_FINAL_SISTEMA:")[0].trim(), 
        notaFinal: notaExtraida 
      });

      // Atualiza a tela em tempo real
      const projetoAtualizado = { 
        ...projeto, 
        avaliacaoProfessorIA: textoIA.split("NOTA_FINAL_SISTEMA:")[0].trim(), 
        notaFinal: notaExtraida 
      };
      
      setProjetoVisualizacao(projetoAtualizado);
      setProjetosFiltrados(projetosFiltrados.map(p => p.id === projeto.id ? projetoAtualizado : p));
      
      alert(`Auto-Avaliação Concluída! Nota Atribuída: ${notaExtraida}`);

    } catch (e) { alert("Erro de resposta da IA ao avaliar."); }
    setIsIAProfWait(false);
  };

  const gerarProvaDoGrupoFoco = async (projeto) => {
    setIsProvaWait(true);
    const prompt = `Você é o Professor Gerson Braz elaborando uma prova. ESTRUTURA OBRIGATÓRIA:
    1. CABEÇALHO: INSTITUIÇÃO: Uniara | CURSO: Sistemas de Informação | DISCIPLINA: Gestão do Conhecimento | PROFESSOR: Gerson Braz | GRUPO: ${projeto.nomeGrupo || 'Sem Nome'} | ALUNO(A): [NOME_DO_ALUNO]
    2. 3 QUESTÕES TEÓRICAS: Focadas nos conceitos do problema investigado por eles (${projeto.gapPrincipal}).
    3. 3 QUESTÕES PRÁTICAS DO PROJETO: Pegadinhas baseadas nas respostas deles: Empresa (${projeto.empresa}), Solução (${projeto.f2Ferramenta}), Justificativa (${projeto.justTempo}).
    4. Pule linha e digite a tag EXATA: ###GABARITO###
    5. O gabarito.`;

    try {
      const response = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      const textoIA = data.candidates[0].content.parts[0].text;
      
      await updateDoc(doc(db, "projetos_gc", projeto.id), { provaProfessorIA: textoIA });
      
      const projetoAtualizado = { ...projeto, provaProfessorIA: textoIA };
      setProjetoVisualizacao(projetoAtualizado);
      setProjetosFiltrados(projetosFiltrados.map(p => p.id === projeto.id ? projetoAtualizado : p));
      if(projeto.alunos && projeto.alunos.length > 0) setAlunoSelecionadoProva(projeto.alunos[0]);
    } catch (e) { alert("Erro ao gerar prova."); }
    setIsProvaWait(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || formData.evidencias?.length >= 5) return;
    setIsSaving(true);
    const fileRef = ref(storage, `evidencias_gc/${docId}_${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);
    uploadTask.on('state_changed', (s) => setUploadProgress((s.bytesTransferred / s.totalBytes) * 100), null, () => {
      getDownloadURL(uploadTask.snapshot.ref).then((url) => {
        const novas = [...(formData.evidencias || []), { nome: file.name, url: url }];
        setFormData({ ...formData, evidencias: novas });
        setIsSaving(false); updateDoc(doc(db, "projetos_gc", docId), { evidencias: novas });
      });
    });
  };

  const copiarLinkDoGrupo = () => {
    navigator.clipboard.writeText(`${window.location.origin}?id=${docId}`);
    alert("Link do grupo copiado com sucesso!");
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleTagToggle = (pilar, tag) => {
    const field = `diag${pilar.charAt(0).toUpperCase() + pilar.slice(1)}Tags`;
    setFormData({ ...formData, [field]: formData[field].includes(tag) ? formData[field].filter(t => t !== tag) : [...formData[field], tag] });
  };

  const addAluno = () => { if (tempAluno && formData.alunos.length < 6) { setFormData({ ...formData, alunos: [...formData.alunos, tempAluno] }); setTempAluno(""); } };
  const removeAluno = (index) => { setFormData({ ...formData, alunos: formData.alunos.filter((_, i) => i !== index) }); };


  // =========================================================================
  // RENDERIZAÇÃO DO DASHBOARD DO PROFESSOR
  // =========================================================================
  if (showAdmin) {
    return (
      <div className="min-h-screen bg-pink-500 p-4 md:p-8 font-sans">
        
        {/* Navbar Admin */}
        <div className="max-w-7xl mx-auto bg-yellow-400 border-4 border-black p-4 mb-8 shadow-[8px_8px_0px_black] flex justify-between items-center">
           <div className="flex items-center gap-4">
              <Rocket size={32} className="text-black" />
              <div>
                <h1 className="text-2xl font-black uppercase text-black leading-none">Painel Docente GC</h1>
                <p className="text-xs font-bold text-black border-t-2 border-black mt-1 pt-1">Prof. Gerson Braz • SI Uniara</p>
              </div>
           </div>
           <button onClick={() => setShowAdmin(false)} className={`${btnBrutal} bg-white hover:bg-red-400 hover:text-white`}>
              Sair
           </button>
        </div>

        <div className="max-w-7xl mx-auto">
          {!atividadeSelecionada ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Coluna Esquerda: Nova Atividade Parametrizada */}
                <div className="lg:col-span-1">
                  <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_black]">
                    <h3 className="text-xl font-black uppercase mb-4 border-b-4 border-black pb-2 flex items-center gap-2">
                      <FolderPlus size={24} /> Configurar Turma
                    </h3>
                    <form onSubmit={criarNovaAtividade} className="space-y-4">
                      <div><label className="block text-[10px] font-black uppercase mb-1">Nome da Avaliação</label><input type="text" value={novaAtivNome} onChange={(e) => setNovaAtivNome(e.target.value)} className={inputStyle} required /></div>
                      <div className="flex gap-2">
                        <div className="w-1/2"><label className="block text-[10px] font-black uppercase mb-1">Turma</label><input type="text" value={novaAtivTurma} onChange={(e) => setNovaAtivTurma(e.target.value)} className={inputStyle} required /></div>
                        <div className="w-1/2"><label className="block text-[10px] font-black uppercase mb-1">Nota Máx</label><input type="number" value={novaAtivNotaMax} onChange={(e) => setNovaAtivNotaMax(e.target.value)} className={inputStyle} required /></div>
                      </div>
                      
                      <div className="bg-gray-100 p-3 border-2 border-black mt-4">
                        <p className="text-[10px] font-black uppercase border-b-2 border-black mb-2 pb-1">Pesos p/ Auto-Avaliação (%)</p>
                        <div className="flex gap-2">
                          <div><label className="text-[9px] font-bold uppercase">Diag.</label><input type="number" value={pesoDiag} onChange={(e) => setPesoDiag(e.target.value)} className="w-full p-1 border-2 border-black text-center text-xs" /></div>
                          <div><label className="text-[9px] font-bold uppercase">Roadmap</label><input type="number" value={pesoRoad} onChange={(e) => setPesoRoad(e.target.value)} className="w-full p-1 border-2 border-black text-center text-xs" /></div>
                          <div><label className="text-[9px] font-bold uppercase">Filtro</label><input type="number" value={pesoFiltro} onChange={(e) => setPesoFiltro(e.target.value)} className="w-full p-1 border-2 border-black text-center text-xs" /></div>
                        </div>
                      </div>

                      <button type="submit" className={`${btnBrutal} bg-lime-400 w-full mt-2`}>Cadastrar Turma</button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-2xl font-black uppercase bg-black text-white p-3 inline-block shadow-[4px_4px_0px_white]">Turmas Ativas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {atividades.map(a => (
                      <div key={a.id} className="bg-purple-200 border-4 border-black p-5 shadow-[6px_6px_0px_black] flex flex-col justify-between">
                        <div>
                          <span className="bg-white border-2 border-black text-xs font-black uppercase px-2 py-1">{a.turma}</span>
                          <h4 className="text-xl font-black uppercase mt-3">{a.nome}</h4>
                          <p className="text-[10px] font-bold bg-white border-2 border-black p-1 mt-2 inline-block">Cód: {a.id} | Máx: {a.notaMaxima} | Pesos: {a.pesos?.diagnostico}/{a.pesos?.roadmap}/{a.pesos?.filtro}</p>
                        </div>
                        <div className="mt-6 flex justify-between items-center border-t-4 border-black pt-4">
                          <button onClick={() => excluirAtividadeCompleta(a.id)} className="bg-red-500 text-white p-2 border-2 border-black hover:scale-105"><Trash2 size={20} /></button>
                          <button onClick={() => selecionarAtividadeDashboard(a)} className={`${btnBrutal} bg-cyan-300 py-2`}>Ver Dashboard</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 relative">
              <button onClick={() => setAtividadeSelecionada(null)} className={`${btnBrutal} bg-white inline-flex`}><ArrowLeft size={16} /> Voltar</button>

              <div className="bg-purple-700 text-white p-6 border-4 border-black shadow-[8px_8px_0px_black]">
                <span className="bg-white text-black font-black uppercase px-3 py-1 border-2 border-black text-xs">{atividadeSelecionada.turma}</span>
                <h2 className="text-3xl font-black uppercase mt-4">{atividadeSelecionada.nome}</h2>
              </div>

              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_black]">
                <div className="bg-yellow-400 p-4 border-b-4 border-black"><h3 className="text-xl font-black uppercase">Grupos da Turma</h3></div>
                <div className="p-6 space-y-4">
                  {projetosFiltrados.map(p => {
                    const isConcluido = p.etapaConcluida === 5;
                    const temProva = p.provaProfessorIA && p.provaProfessorIA.includes("###GABARITO###");

                    return (
                      <div key={p.id} className="bg-gray-50 border-4 border-black p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:bg-yellow-50 transition-colors">
                        <div className="flex-1">
                          <h4 className="text-xl font-black uppercase">{p.nomeGrupo || "Sem Nome"}</h4>
                          <p className="text-xs font-bold uppercase bg-white border-2 border-black px-2 py-0.5 inline-block mt-1 mb-2">{p.empresa}</p>
                          <p className="text-xs font-bold text-gray-600">Alunos: {p.alunos?.join(", ")}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                          <div className="flex items-center gap-2 bg-white p-1.5 border-4 border-black">
                            <span className="font-black text-xs uppercase">Nota:</span>
                            <input type="number" step="0.1" defaultValue={p.notaFinal || ""} onBlur={(e) => salvarNotaProfessor(p.id, e.target.value)} className="w-14 p-0.5 border-2 border-black font-black text-center bg-yellow-100" />
                          </div>
                          
                          {/* BOTÃO ABRIR QUE AGORA ABRE O MODAL SEM SAIR DO PAINEL */}
                          <button 
                            onClick={() => {
                               setProjetoVisualizacao(p);
                               if(p.alunos && p.alunos.length > 0) setAlunoSelecionadoProva(p.alunos[0]);
                            }} 
                            className={`${btnBrutal} bg-black text-white py-2 px-6`}
                          >
                            <Eye size={16}/> Avaliar & Provas
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            O GRANDE MODAL DE AVALIAÇÃO (VISUALIZAÇÃO COMPLETA DO PROJETO)
            ========================================================================= */}
        {projetoEmVisualizacao && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white border-8 border-black p-6 w-full max-w-5xl shadow-[12px_12px_0px_black] space-y-6 relative max-h-[90vh] overflow-y-auto">
               
               <button onClick={() => setProjetoVisualizacao(null)} className="absolute top-4 right-4 border-4 border-black p-2 bg-red-500 text-white font-black hover:bg-red-600 z-10 shadow-[2px_2px_0px_black]">
                 FECHAR <X size={20} className="inline"/>
               </button>

               <div className="bg-purple-700 text-white p-6 border-4 border-black shadow-[4px_4px_0px_black] mt-8">
                 <h2 className="text-3xl font-black uppercase tracking-wider">{projetoEmVisualizacao.nomeGrupo}</h2>
                 <p className="text-xs font-bold mt-2 uppercase bg-black px-2 py-1 inline-block">Empresa: {projetoEmVisualizacao.empresa}</p>
                 <p className="text-sm font-bold mt-4">Integrantes: {projetoEmVisualizacao.alunos?.join(", ")}</p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* COLUNA ESQUERDA: O RELATÓRIO DO ALUNO (SOMENTE LEITURA) */}
                  <div className="space-y-6 bg-gray-50 p-6 border-4 border-black h-fit">
                     <h3 className="font-black uppercase text-xl border-b-4 border-black pb-2">1. Diagnóstico do Grupo</h3>
                     <p className="text-sm font-bold italic bg-white p-4 border-2 border-black">"{projetoEmVisualizacao.gapPrincipal}"</p>
                     
                     <h3 className="font-black uppercase text-xl border-b-4 border-black pb-2 mt-6">2. Roadmap Proposto</h3>
                     <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 border-2 border-black"><span className="font-black block">F1: Sensibilização</span>{projetoEmVisualizacao.f1AcaoEngajamento}</div>
                        <div className="bg-white p-2 border-2 border-black"><span className="font-black block">F2: Tecnologia</span>{projetoEmVisualizacao.f2Ferramenta}</div>
                        <div className="bg-white p-2 border-2 border-black"><span className="font-black block">F3: Piloto</span>{projetoEmVisualizacao.f3SetorPiloto}</div>
                        <div className="bg-white p-2 border-2 border-black"><span className="font-black block">F4: Sustentação</span>{projetoEmVisualizacao.f4NovaRotina}</div>
                     </div>

                     <h3 className="font-black uppercase text-xl border-b-4 border-black pb-2 mt-6">3. Defesa de Viabilidade</h3>
                     <ul className="text-xs space-y-2">
                        <li><span className="font-black">Orçamento:</span> {projetoEmVisualizacao.justOrcamento}</li>
                        <li><span className="font-black">Tempo:</span> {projetoEmVisualizacao.justTempo}</li>
                        <li><span className="font-black">Eficácia:</span> {projetoEmVisualizacao.justManutencao}</li>
                     </ul>

                     <h3 className="font-black uppercase text-xl border-b-4 border-black pb-2 mt-6">4. Parecer IA (Conselho)</h3>
                     <p className="text-xs bg-black text-lime-400 p-4 font-mono">{projetoEmVisualizacao.feedbackIA}</p>
                  </div>

                  {/* COLUNA DIREITA: FERRAMENTAS DO PROFESSOR */}
                  <div className="space-y-6">
                     
                     {/* FERRAMENTA 1: AUTO-AVALIADOR (NOVO) */}
                     <div className="bg-cyan-100 border-4 border-black p-6 shadow-[4px_4px_0px_black]">
                        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                          <h4 className="font-black uppercase text-lg flex items-center gap-2"><BrainCircuit size={20}/> Auto-Avaliador</h4>
                          <div className="bg-white px-3 py-1 border-4 border-black font-black text-xl">NOTA: {projetoEmVisualizacao.notaFinal || "?"}</div>
                        </div>

                        {!projetoEmVisualizacao.avaliacaoProfessorIA ? (
                           <div className="space-y-4">
                             <p className="text-xs font-bold">A IA irá calcular a nota final baseada nos pesos que você definiu para esta turma.</p>
                             <button onClick={() => autoAvaliarAtribuirNota(projetoEmVisualizacao)} disabled={isIAProfWait} className={`${btnBrutal} bg-black text-white w-full`}>
                               {isIAProfWait ? "LENDO E CALCULANDO..." : "🤖 AUTO-AVALIAR E ATRIBUIR NOTA"}
                             </button>
                           </div>
                        ) : (
                           <div className="space-y-4">
                             <div className="bg-white p-4 border-4 border-black text-xs font-bold leading-relaxed whitespace-pre-wrap">{projetoEmVisualizacao.avaliacaoProfessorIA}</div>
                             
                             <div className="flex items-center gap-2">
                               <label className="text-xs font-black uppercase">Alterar Nota Manualmente:</label>
                               <input type="number" step="0.1" defaultValue={projetoEmVisualizacao.notaFinal || ""} onBlur={(e) => salvarNotaProfessor(projetoEmVisualizacao.id, e.target.value)} className="w-16 p-1 border-4 border-black font-black text-center outline-none bg-yellow-100" />
                             </div>

                             <button onClick={() => autoAvaliarAtribuirNota(projetoEmVisualizacao)} disabled={isIAProfWait} className="text-xs font-black uppercase underline hover:text-blue-600 block">↻ Recalcular Dossiê e Nota</button>
                           </div>
                        )}
                     </div>

                     {/* FERRAMENTA 2: CENTRAL DE PROVAS */}
                     <div className="bg-orange-300 border-4 border-black p-6 shadow-[4px_4px_0px_black]">
                        <h4 className="font-black uppercase text-lg mb-4 border-b-4 border-black pb-2 flex items-center gap-2"><FileText size={20}/> Gerador de Provas</h4>
                        
                        {(!projetoEmVisualizacao.provaProfessorIA || !projetoEmVisualizacao.provaProfessorIA.includes("###GABARITO###")) ? (
                          <button onClick={() => gerarProvaDoGrupoFoco(projetoEmVisualizacao)} disabled={isProvaWait} className={`${btnBrutal} bg-white w-full`}>
                            {isProvaWait ? "MONTANDO..." : "GERAR QUESTÕES DESTE GRUPO"}
                          </button>
                        ) : (
                          <div className="space-y-4">
                             <select value={alunoSelecionadoProva} onChange={(e) => setAlunoSelecionadoProva(e.target.value)} className="w-full p-2 border-4 border-black font-black text-sm bg-yellow-100 outline-none">
                               {projetoEmVisualizacao.alunos?.map((a, i) => (<option key={i} value={a}>{a}</option>))}
                             </select>
                             
                             <div className="bg-white p-4 border-4 border-black font-serif text-xs max-h-32 overflow-y-auto">
                               {projetoEmVisualizacao.provaProfessorIA.split("###GABARITO###")[0].replace(/\[NOME_DO_ALUNO\]/g, alunoSelecionadoProva)}
                             </div>

                             <div className="flex gap-2">
                               <button onClick={() => {
                                 const provaPronta = projetoEmVisualizacao.provaProfessorIA.split("###GABARITO###")[0].replace(/\[NOME_DO_ALUNO\]/g, alunoSelecionadoProva);
                                 navigator.clipboard.writeText(provaPronta).then(() => alert(`Copiado!`));
                               }} className={`${btnBrutal} bg-lime-400 py-2 flex-1`}>Copiar Um</button>

                               <button onClick={() => {
                                 const provaBase = projetoEmVisualizacao.provaProfessorIA.split("###GABARITO###")[0];
                                 let provasCompletas = projetoEmVisualizacao.alunos.map(aluno => provaBase.replace(/\[NOME_DO_ALUNO\]/g, aluno)).join("\n\n========================================================\n\n");
                                 navigator.clipboard.writeText(provasCompletas).then(() => alert(`Todos copiados!`));
                               }} className={`${btnBrutal} bg-cyan-400 py-2 flex-1`}>Copiar Todos</button>
                             </div>
                          </div>
                        )}
                     </div>

                  </div>
               </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // INTERFACE INTERATIVA DO ALUNO (MANTIDA)
  // =========================================================================
  return (
    <div className="min-h-screen bg-pink-500 p-4 md:p-10 font-sans print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto bg-white border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)] print:border-none print:shadow-none print:max-w-none print:m-0">
        
        <div className="bg-yellow-400 p-6 border-b-4 border-black flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
          <div className="flex items-center gap-4">
             <img src={uniaraLogo} alt="Uniara" className="h-12 border-4 border-black bg-white" />
             <div>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black">GC-LAB 4.0</h1>
                <p className="text-black font-bold text-[10px] md:text-xs bg-white inline-block px-2 border-2 border-black">LABORATÓRIO NITE</p>
             </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 items-center">
            {docId && (
              <button onClick={copiarLinkDoGrupo} className="bg-white text-black p-2 border-2 border-black text-xs uppercase font-black flex items-center gap-2 shadow-[2px_2px_0px_black] hover:bg-cyan-200">
                <Link size={16} /> Link do Grupo
              </button>
            )}
            <button onClick={carregarAtividadesDoBanco} className="p-2 border-2 border-black text-xs uppercase font-black flex items-center gap-2 shadow-[2px_2px_0px_black] bg-black text-white hover:bg-gray-800">
              <Users size={14} /> Professor
            </button>
            <div className="font-black text-lg md:text-xl text-black bg-white px-3 py-2 border-4 border-black shadow-[4px_4px_0px_black]">ETAPA {step}/5</div>
          </div>
        </div>

        <div className="p-4 md:p-10 bg-gray-50 print:bg-white print:p-0">
          {isSaving && <div className="fixed bottom-5 right-5 bg-black text-lime-400 p-4 border-4 border-lime-400 font-black z-50 print:hidden">SALVANDO...</div>}

          {step === 1 && !formData.atividadeId && !docId && (
            <div className="max-w-md mx-auto my-6 space-y-6 print:hidden">
              <div className="border-4 border-black p-6 bg-yellow-100 shadow-[6px_6px_0px_black] space-y-4">
                <h3 className="text-xl font-black uppercase text-center">Nova Rodada</h3>
                <div className="space-y-2">
                  <select id="codAtivInput" className={inputStyle}>
                    <option value="">-- ESCOLHA A SUA TURMA --</option>
                    {atividades.map(a => (<option key={a.id} value={a.id}>{a.nome} ({a.turma})</option>))}
                  </select>
                  <button onClick={() => {
                    const val = document.getElementById('codAtivInput').value;
                    if(val) setFormData(prev => ({ ...prev, atividadeId: val }));
                  }} className={`${btnBrutal} w-full bg-black text-white`}>Vincular</button>
                </div>
              </div>
              <div className="border-4 border-black p-5 bg-orange-100 shadow-[6px_6px_0px_black] space-y-3">
                <h4 className="font-black uppercase text-sm text-center flex items-center justify-center gap-1"><History size={16}/> Resgatar Projeto</h4>
                <div className="flex">
                  <input type="text" id="inputCodigoAntigo" placeholder="Token / ID..." className="p-2 border-4 border-black outline-none font-bold text-xs w-full bg-white" />
                  <button onClick={() => carregarProjetoPeloId(document.getElementById('inputCodigoAntigo').value)} className="bg-orange-500 text-white px-4 font-black uppercase text-xs border-y-4 border-r-4 border-black">Resgatar</button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (formData.atividadeId || docId) && (
            <div className="space-y-6 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><label className="font-black uppercase text-[11px]">Nome do Grupo</label><input type="text" name="nomeGrupo" value={formData.nomeGrupo} onChange={handleChange} className={inputStyle} /></div>
                <div><label className="font-black uppercase text-[11px]">Empresa Alvo</label><input type="text" name="empresa" value={formData.empresa} onChange={handleChange} className={inputStyle} /></div>
                <div><label className="font-black uppercase text-[11px]">Área de Negócio</label><input type="text" name="area" value={formData.area} onChange={handleChange} className={inputStyle} /></div>
              </div>
              <div className="border-4 border-black p-4 bg-white shadow-[4px_4px_0px_black]">
                <label className="font-black uppercase block mb-2 italic">Consultores da Equipe</label>
                <div className="flex gap-2 mb-4">
                  <input type="text" value={tempAluno} onChange={(e) => setTempAluno(e.target.value)} placeholder="Nome do Aluno..." className={inputStyle} />
                  <button onClick={addAluno} className={`${btnBrutal} bg-lime-400 px-6`}>+</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {formData.alunos.map((aluno, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-100 border-2 border-black p-2 font-bold text-xs uppercase">
                      {aluno} <button onClick={() => removeAluno(i)} className="text-red-600"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-6 print:hidden">
                {['pessoas', 'processos', 'tecnologia'].map(pilar => (
                  <div key={pilar} className="p-4 border-4 border-black bg-white shadow-[4px_4px_0px_black]">
                    <h3 className="font-black uppercase mb-4 text-xl underline italic">{pilar}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {presets[pilar].map(tag => (
                        <button key={tag} onClick={() => handleTagToggle(pilar, tag)} className={`p-2 border-2 border-black text-[10px] font-black ${formData[`diag${pilar.charAt(0).toUpperCase() + pilar.slice(1)}Tags`].includes(tag) ? 'bg-black text-white' : 'bg-white'}`}>{tag}</button>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
          )}

          {step === 3 && (
            <div className="space-y-6 print:hidden">
              <div className="border-4 border-black p-6 bg-red-100 shadow-[6px_6px_0px_black]">
                <label className="font-black uppercase block mb-2 text-xl">Mapeamento do Problema Central</label>
                <textarea name="gapPrincipal" value={formData.gapPrincipal} onChange={handleChange} className={inputStyle} rows="4"></textarea>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-100 p-4 border-4 border-black shadow-[4px_4px_0px_black]"><h4 className="font-black mb-2 uppercase">Fase 1: Sensibilização</h4><input type="text" name="f1AcaoEngajamento" value={formData.f1AcaoEngajamento} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-orange-100 p-4 border-4 border-black shadow-[4px_4px_0px_black]"><h4 className="font-black mb-2 uppercase">Fase 2: Tecnologia</h4><input type="text" name="f2Ferramenta" value={formData.f2Ferramenta} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-pink-100 p-4 border-4 border-black shadow-[4px_4px_0px_black]"><h4 className="font-black mb-2 uppercase">Fase 3: Piloto</h4><input type="text" name="f3SetorPiloto" value={formData.f3SetorPiloto} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-lime-100 p-4 border-4 border-black shadow-[4px_4px_0px_black]"><h4 className="font-black mb-2 uppercase">Fase 4: Sustentação</h4><input type="text" name="f4NovaRotina" value={formData.f4NovaRotina} onChange={handleChange} className={inputStyle} /></div>
              </div>

              <div className="border-8 border-black p-6 bg-black text-white shadow-[8px_8px_0px_#ff00ff]">
                <div className="flex items-center gap-3 mb-4"><ShieldCheck size={32} className="text-lime-400" /><h3 className="text-2xl font-black uppercase italic">Conselho Executivo (IA)</h3></div>
                {feedbackConselho ? (
                  <div className="bg-white text-black p-4 border-4 border-lime-400 font-mono text-sm mb-4 leading-relaxed whitespace-pre-wrap">{feedbackConselho}</div>
                ) : <p className="text-xs font-bold mb-4 text-gray-400 italic">O conselho aguarda submissão...</p>}
                <button onClick={validarComConselho} disabled={isIAWait} className={`${btnBrutal} bg-lime-400 text-black w-full disabled:opacity-50`}>{isIAWait ? "PROCESSANDO..." : "SUBMETER AO CONSELHO"}</button>
              </div>

              <div className="p-6 bg-red-400 border-4 border-black shadow-[6px_6px_0px_black] space-y-4">
                <h3 className="text-xl font-black uppercase">Filtro de Realidade</h3>
                <div className="space-y-4 bg-white p-4 border-4 border-black">
                   <div className="space-y-2"><label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkOrcamento" checked={formData.chkOrcamento} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 1. Recurso Disponível?</label>{formData.chkOrcamento && <textarea name="justOrcamento" value={formData.justOrcamento} onChange={handleChange} className={inputStyle} rows="2"></textarea>}</div>
                   <div className="space-y-2"><label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkTempo" checked={formData.chkTempo} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 2. Tempo na Rotina?</label>{formData.chkTempo && <textarea name="justTempo" value={formData.justTempo} onChange={handleChange} className={inputStyle} rows="2"></textarea>}</div>
                   <div className="space-y-2"><label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkManutencao" checked={formData.chkManutencao} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 3. Resolve a Dor?</label>{formData.chkManutencao && <textarea name="justManutencao" value={formData.justManutencao} onChange={handleChange} className={inputStyle} rows="2"></textarea>}</div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div id="printArea" className="bg-white p-8 md:p-12 border border-gray-200 font-sans text-gray-800 mx-auto max-w-4xl shadow-md print:border-none print:shadow-none print:max-w-full">
                <div className="flex justify-between items-center border-b-2 border-blue-900 pb-6 mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wider">Projeto Executivo</h1>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">Gestão do Conhecimento</h2>
                  </div>
                  <img src={uniaraLogo} alt="Uniara" className="h-12 opacity-90" />
                </div>
                <div className="grid grid-cols-2 gap-6 mb-10 text-sm">
                  <div><p className="text-gray-400 uppercase text-[10px] font-bold mb-1">Empresa</p><p className="font-bold text-lg text-gray-900">{formData.empresa}</p></div>
                  <div><p className="text-gray-400 uppercase text-[10px] font-bold mb-1">Equipe</p><p className="font-medium text-gray-800">{formData.alunos.join(", ")}</p></div>
                </div>
                <div className="mb-8">
                  <h3 className="text-blue-900 font-bold uppercase text-xs border-b border-gray-300 pb-2 mb-4">1. Diagnóstico Central</h3>
                  <p className="text-gray-800 bg-gray-50 p-4 border-l-4 border-blue-900 italic">"{formData.gapPrincipal}"</p>
                </div>
                <div className="mt-16 text-center text-[10px] text-gray-400 border-t border-gray-200 pt-6">Sistema Analítico GC-LAB 4.0 — Prof. Gerson Braz</div>
              </div>
            </div>
          )}

          {(formData.atividadeId || docId) && (
            <div className="mt-12 flex justify-between gap-4 print:hidden">
              {step > 1 && <button onClick={() => setStep(step - 1)} className={`${btnBrutal} bg-white`}>Voltar</button>}
              {step < 4 ? (
                <button onClick={() => salvarNoFirebase(step + 1)} className={`${btnBrutal} bg-cyan-400`}>Avançar</button>
              ) : step === 4 ? (
                <button 
                  onClick={() => salvarNoFirebase(5)} 
                  disabled={!(formData.chkOrcamento && formData.justOrcamento && formData.chkTempo && formData.justTempo && formData.chkManutencao && formData.justManutencao && formData.feedbackIA)} 
                  className={`${btnBrutal} bg-lime-400 disabled:opacity-50`}
                >
                  Gerar Relatório
                </button>
              ) : (
                <button onClick={() => window.print()} className={`${btnBrutal} bg-black text-white`}>🖨️ Imprimir PDF</button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}