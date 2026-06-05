import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Lightbulb, ClipboardCheck, Rocket, UploadCloud, Link, Users, Eye, MessageSquareQuote, ShieldCheck, FolderPlus, ArrowLeft, CheckCircle, Clock, History, FileText, Award, X } from 'lucide-react';
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
  
  // Estados de Gerenciamento de Provas
  const [grupoExameFoco, setGrupoExameFoco] = useState(null);
  const [alunoSelecionadoProva, setAlunoSelecionadoProva] = useState("");
  const [showGabaritosModal, setShowGabaritosModal] = useState(false); // NOVO: Modal de Gabaritos

  // Formulário para criar atividade
  const [novaAtivNome, setNovaAtivNome] = useState("");
  const [novaAtivTurma, setNovaAtivTurma] = useState("");
  const [novaAtivNotaMax, setNovaAtivNotaMax] = useState("10");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedbackConselho, setFeedbackConselho] = useState("");
  const [isIAWait, setIsIAWait] = useState(false);
  const [isIAProfWait, setIsIAProfWait] = useState(false);
  const [isProvaWait, setIsProvaWait] = useState(false); 

  const [formData, setFormData] = useState({
    atividadeId: '', 
    nomeGrupo: '', empresa: '', area: '', alunos: [],
    qPessoasSaida: '', qPessoasErro: '', diagPessoasTags: [], diagPessoasObs: '',
    qProcessosTreinamento: '', qProcessosAtualizacao: '', diagProcessosTags: [], diagProcessosObs: '',
    qTecnologiaBusca: '', qTecnologiaSilos: '', diagTecnologiaTags: [], diagTecnologiaObs: '',
    nivelMaturidade: '1', gapPrincipal: '', impactoNegocio: '',
    f1Patrocinador: '', f1AcaoEngajamento: '', f2Ferramenta: '', f2ResponsavelTI: '',
    f3SetorPiloto: '', f3CriterioSucesso: '', f4NovaRotina: '', f4DonoProcesso: '',
    chkOrcamento: false, justOrcamento: '',
    chkTempo: false, justTempo: '',
    chkManutencao: false, justManutencao: '',
    evidencias: [], feedbackIA: '', avaliacaoProfessorIA: '', provaProfessorIA: '', 
    notaFinal: '', 
    etapaConcluida: 1
  });

  const presets = {
    pessoas: ["Resistência", "Heróis do Conhecimento", "Falta de tempo", "Cultura de punição", "Alta rotatividade"],
    processos: ["Onboarding informal", "Manuais desatualizados", "Depende de memória", "Retrabalho", "Sem lições aprendidas"],
    tecnologia: ["Silos no WhatsApp", "Sistemas difíceis", "Sem base central", "Busca ineficiente", "Muitas planilhas"]
  };

  const inputStyle = "w-full p-3 border-4 border-black bg-white focus:bg-yellow-100 outline-none shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all font-bold text-black text-sm";
  const btnBrutal = "px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 text-xs md:text-sm";

  const buscarAtividadesPublicas = async () => {
    try {
      const qAct = query(collection(db, "atividades_gc"), orderBy("createdAt", "desc"));
      const snapAct = await getDocs(qAct);
      setAtividades(snapAct.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Erro ao carregar atividades", e); }
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
    try {
      await addDoc(collection(db, "atividades_gc"), {
        nome: novaAtivNome, turma: novaAtivTurma, notaMaxima: novaAtivNotaMax, createdAt: serverTimestamp()
      });
      setNovaAtivNome(""); setNovaAtivTurma(""); buscarAtividadesPublicas(); 
      alert("Atividade criada com sucesso!");
    } catch (e) { console.error(e); }
  };

  const carregarAtividadesDoBanco = async () => {
    if (!isAdminAuth) {
      const senha = prompt("Senha do Professor:");
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
    } catch (e) { alert("Erro ao salvar nota"); }
  };

  const vincularAtividadeProjetoAntigo = async (pId, actId) => {
    try {
      await updateDoc(doc(db, "projetos_gc", pId), { atividadeId: actId });
      alert("Projeto vinculado à atividade!");
      carregarAtividadesDoBanco();
    } catch (e) { alert("Erro ao vincular atividade."); }
  };

  const excluirAtividadeCompleta = async (aId) => {
    if(window.confirm("Apagar a atividade removerá o acesso ao dashboard dela. Continuar?")) {
      await deleteDoc(doc(db, "atividades_gc", aId));
      setAtividades(atividades.filter(a => a.id !== aId));
      if(atividadeSelecionada?.id === aId) setAtividadeSelecionada(null);
    }
  };

  const excluirProjetoDoDashboard = async (pId) => {
    if(window.confirm("Deseja apagar esse grupo definitivamente?")) {
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

  const gerarAvaliacaoProfessor = async () => {
    setIsIAProfWait(true);
    const prompt = `Aja como o professor avaliador Gerson Braz de Gestão do Conhecimento. Analise as respostas deste grupo e indique detalhadamente: 1) Pontos Fortes, 2) Pontos Fracos, 3) Nota Sugerida de 0 a 10. Projeto: Problema: ${formData.gapPrincipal}, Roadmap: ${formData.f1AcaoEngajamento} -> ${formData.f2Ferramenta}, Defesa: ${formData.justOrcamento} / ${formData.justTempo}.`;
    try {
      const response = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      const textoIA = data.candidates[0].content.parts[0].text;
      setFormData(prev => ({ ...prev, avaliacaoProfessorIA: textoIA }));
      await updateDoc(doc(db, "projetos_gc", docId), { avaliacaoProfessorIA: textoIA });
    } catch (e) { alert("Erro de resposta da IA"); }
    setIsIAProfWait(false);
  };

  const gerarProvaDoGrupoFoco = async (projeto) => {
    setIsProvaWait(true);
    const prompt = `Você é o Professor Gerson Braz. Sua missão é gerar uma avaliação acadêmica oficial e rigorosa para a disciplina de Gestão do Conhecimento no curso de Sistemas de Informação da Uniara. É REQUISITO OBRIGATÓRIO seguir exatamente a estrutura de 6 questões abaixo.

    ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

    1. CABEÇALHO EXATO:
    INSTITUIÇÃO: Uniara
    CURSO: Sistemas de Informação
    DISCIPLINA: Gestão do Conhecimento
    PROFESSOR: Gerson Braz
    GRUPO: ${projeto.nomeGrupo || 'Sem Nome'}
    ALUNO(A): [NOME_DO_ALUNO]

    2. QUESTÕES TEÓRICAS DIRECIONADAS AO ESCOPO (Questões 1, 2 e 3):
    Crie exatamente 3 questões de múltipla escolha (A, B, C, D) focadas em conceitos teóricos puros de Gestão do Conhecimento. 
    ATENÇÃO: Estas questões NÃO devem ser genéricas. Elas devem abordar os fundamentos científicos e teóricos do problema que ESSE grupo investigou.
    - Se o projeto foca em problemas de Pessoas (Ex: Heróis do Conhecimento, retenção), as questões devem cobrar teorias de Conhecimento Tácito, Socialização ou Capital Intelectual.
    - Se o projeto foca em Processos (Ex: Falta de manuais, onboarding informal), cobre teorias de Externalização (Modelo SECI) ou Ativos de Conhecimento Explícito.
    - Se foca em Tecnologia (Ex: Silos no WhatsApp, planilhas), cobre teorias de Sistemas de Memória Organizacional, Taxonomia ou Arquitetura de Informação.
    Analise os dados reais do grupo abaixo para escolher os 3 temas teóricos correspondentes.

    3. QUESTÕES PRÁTICAS AUDITORIA DO PROJETO (Questões 4, 5 e 6):
    Crie exatamente 3 questões de múltipla escolha (A, B, C, D) de auditoria situacional, baseadas estritamente nos dados que o grupo preencheu no laboratório para pegar alunos caronas que não participaram:
    - Empresa alvo do grupo: ${projeto.empresa}
    - Problema estratégico mapeado: ${projeto.gapPrincipal}
    - Ferramenta tecnológica escolhida (Fase 2): ${projeto.f2Ferramenta}
    - Justificativa operacional de tempo na rotina: ${projeto.justTempo}

    4. DIVISOR DE SEGURANÇA:
    Logo após a alternativa D da questão 6, pule uma linha e digite exatamente:
    ###GABARITO###

    5. GABARITO OFICIAL:
    Abaixo da tag, coloque as alternativas corretas (ex: 1-A, 2-C, etc).`;

    try {
      const response = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      const textoIA = data.candidates[0].content.parts[0].text;
      
      await updateDoc(doc(db, "projetos_gc", projeto.id), { provaProfessorIA: textoIA });
      
      const projetoAtualizado = { ...projeto, provaProfessorIA: textoIA };
      setGrupoExameFoco(projetoAtualizado);
      setProjetosFiltrados(projetosFiltrados.map(p => p.id === projeto.id ? projetoAtualizado : p));
      setProjetosRemotos(projetosRemotos.map(p => p.id === projeto.id ? projetoAtualizado : p));
      if(projeto.alunos && projeto.alunos.length > 0) setAlunoSelecionadoProva(projeto.alunos[0]);
    } catch (e) { alert("Erro ao acionar a IA para a prova."); }
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

  const projetosOrfaos = projetosRemotos.filter(p => !p.atividadeId || p.atividadeId === "");

  // =========================================================================
  // RENDERIZAÇÃO DO DASHBOARD DO PROFESSOR (BRUTALIST ORIGINAL)
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
              Voltar ao Início
           </button>
        </div>

        <div className="max-w-7xl mx-auto">
          {!atividadeSelecionada ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-1">
                  <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_black]">
                    <h3 className="text-xl font-black uppercase mb-4 border-b-4 border-black pb-2 flex items-center gap-2">
                      <FolderPlus size={24} /> Nova Turma
                    </h3>
                    <form onSubmit={criarNovaAtividade} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black uppercase mb-1">Nome da Avaliação</label>
                        <input type="text" value={novaAtivNome} onChange={(e) => setNovaAtivNome(e.target.value)} placeholder="Ex: Projeto Integrador I" className={inputStyle} required />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase mb-1">Turma</label>
                        <input type="text" value={novaAtivTurma} onChange={(e) => setNovaAtivTurma(e.target.value)} placeholder="Ex: SI 7º Semestre" className={inputStyle} required />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase mb-1">Nota Máxima</label>
                        <input type="number" value={novaAtivNotaMax} className={inputStyle} required />
                      </div>
                      <button type="submit" className={`${btnBrutal} bg-lime-400 w-full mt-4`}>
                        Criar Turma
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-2xl font-black uppercase bg-black text-white p-3 inline-block shadow-[4px_4px_0px_white]">Turmas Ativas</h3>
                  {atividades.length === 0 && <p className="text-sm font-bold bg-white p-4 border-4 border-black">Nenhuma turma configurada.</p>}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {atividades.map(a => (
                      <div key={a.id} className="bg-purple-200 border-4 border-black p-5 shadow-[6px_6px_0px_black] flex flex-col justify-between">
                        <div>
                          <span className="bg-white border-2 border-black text-xs font-black uppercase px-2 py-1">{a.turma}</span>
                          <h4 className="text-xl font-black uppercase mt-3">{a.nome}</h4>
                          <p className="text-xs font-bold bg-white border-2 border-black p-1 mt-2 inline-block">Cód: {a.id}</p>
                        </div>
                        <div className="mt-6 flex justify-between items-center border-t-4 border-black pt-4">
                          <button onClick={() => excluirAtividadeCompleta(a.id)} className="bg-red-500 text-white p-2 border-2 border-black hover:scale-105"><Trash2 size={20} /></button>
                          <button onClick={() => selecionarAtividadeDashboard(a)} className={`${btnBrutal} bg-cyan-300 py-2`}>
                            Ver Dashboard
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-orange-400 border-4 border-black p-6 shadow-[8px_8px_0px_black]">
                <h3 className="text-xl font-black uppercase text-black mb-2 flex items-center gap-2"><History size={24}/> Projetos Não Vinculados</h3>
                
                {projetosOrfaos.length === 0 ? (
                  <p className="text-sm font-black bg-white p-3 border-4 border-black inline-block">Nenhum projeto antigo pendente.</p>
                ) : (
                  <div className="space-y-4 mt-4">
                    {projetosOrfaos.map(p => (
                      <div key={p.id} className="bg-white border-4 border-black p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <p className="text-lg font-black uppercase">{p.nomeGrupo || "Sem Nome"} <span className="text-xs font-bold text-gray-500">({p.empresa})</span></p>
                          <p className="text-xs font-bold text-gray-400">ID: {p.id}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-black uppercase">Mover para:</label>
                            <select onChange={(e) => { if(e.target.value) vincularAtividadeProjetoAntigo(p.id, e.target.value); }} className={inputStyle} style={{padding: '5px'}} defaultValue="">
                              <option value="" disabled>Selecionar</option>
                              {atividades.map(a => (<option key={a.id} value={a.id}>{a.turma}</option>))}
                            </select>
                          </div>
                          <button onClick={() => { setFormData(p); setDocId(p.id); setFeedbackConselho(p.feedbackIA || ""); setShowAdmin(false); setStep(5); }} className={`${btnBrutal} bg-black text-white py-1 px-3`}>Open</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              <button onClick={() => setAtividadeSelecionada(null)} className={`${btnBrutal} bg-white inline-flex`}>
                <ArrowLeft size={16} /> Voltar
              </button>

              <div className="bg-purple-700 text-white p-6 border-4 border-black shadow-[8px_8px_0px_black]">
                <span className="bg-white text-black font-black uppercase px-3 py-1 border-2 border-black text-xs">{atividadeSelecionada.turma}</span>
                <h2 className="text-3xl font-black uppercase mt-4">{atividadeSelecionada.nome}</h2>
              </div>

              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_black]">
                
                {/* CABEÇALHO DOS GRUPOS E BOTÃO DE GABARITO DA TURMA */}
                <div className="bg-yellow-400 p-4 border-b-4 border-black flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-black uppercase">Grupos da Turma ({projetosFiltrados.length})</h3>
                  <button 
                    onClick={() => setShowGabaritosModal(true)} 
                    className={`${btnBrutal} bg-black text-white py-2`}
                  >
                    📋 Extrair Gabaritos da Turma
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  {projetosFiltrados.length === 0 && <p className="font-bold text-center py-6">Nenhum grupo ativo.</p>}
                  
                  {projetosFiltrados.map(p => {
                    const isConcluido = p.etapaConcluida === 5;
                    const temProva = p.provaProfessorIA && p.provaProfessorIA.includes("###GABARITO###");

                    return (
                      <div key={p.id} className="bg-gray-50 border-4 border-black p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:bg-yellow-50 transition-colors">
                        <div className="flex-1">
                          <h4 className="text-xl font-black uppercase">{p.nomeGrupo || "Sem Nome"}</h4>
                          <p className="text-xs font-bold uppercase bg-white border-2 border-black px-2 py-0.5 inline-block mt-1 mb-2">{p.empresa}</p>
                          <p className="text-xs font-bold text-gray-600">Alunos: {p.alunos?.join(", ")}</p>
                          <p className="text-[10px] font-mono text-gray-400 mt-1">Token: {p.id}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                          
                          <button 
                            onClick={() => {
                              setGrupoExameFoco(p);
                              if(p.alunos && p.alunos.length > 0) setAlunoSelecionadoProva(p.alunos[0]);
                            }} 
                            className={`${btnBrutal} py-2 px-4 ${temProva ? 'bg-orange-400 text-black' : 'bg-white text-gray-500'}`}
                          >
                            <FileText size={16}/> {temProva ? "Gerenciar Provas" : "Criar Prova"}
                          </button>

                          <div className="flex items-center gap-2 bg-white p-1.5 border-4 border-black">
                            <span className="font-black text-xs uppercase">Nota:</span>
                            <input type="number" step="0.1" defaultValue={p.notaFinal || ""} onBlur={(e) => salvarNotaProfessor(p.id, e.target.value)} className="w-14 p-0.5 border-2 border-black font-black text-center bg-yellow-100" />
                          </div>

                          <button onClick={() => excluirProjetoDoDashboard(p.id)} className="bg-red-500 text-white p-2.5 border-4 border-black hover:bg-red-600"><Trash2 size={18}/></button>
                          <button onClick={() => { setFormData(p); setDocId(p.id); setFeedbackConselho(p.feedbackIA || ""); setShowAdmin(false); setStep(5); }} className={`${btnBrutal} bg-black text-white py-2 px-3`}><Eye size={16}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL CENTRAL DE GABARITOS DA TURMA (NOVO) */}
        {showGabaritosModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white border-8 border-black p-6 w-full max-w-3xl shadow-[12px_12px_0px_black] space-y-6 relative max-h-[90vh] overflow-y-auto">
               
               <button onClick={() => setShowGabaritosModal(false)} className="absolute top-4 right-4 border-4 border-black p-1 bg-red-500 text-white font-black hover:bg-red-600">
                 <X size={20}/>
               </button>

               <div className="border-b-4 border-black pb-4 mb-4">
                 <span className="bg-black text-white text-xs font-black px-2 py-0.5 uppercase">Administrativo Docente</span>
                 <h3 className="text-2xl font-black uppercase text-black mt-2">Chave de Correção: {atividadeSelecionada?.turma}</h3>
                 <p className="text-xs font-bold text-gray-500 mt-1">Extração automática dos gabaritos de todos os grupos com prova gerada.</p>
               </div>

               <div className="space-y-4 font-mono text-sm max-h-[50vh] overflow-y-auto p-2">
                 {projetosFiltrados.filter(p => p.provaProfessorIA && p.provaProfessorIA.includes("###GABARITO###")).length === 0 ? (
                   <p className="font-bold bg-yellow-100 p-4 border-2 border-black">Nenhuma prova foi gerada para os grupos desta turma ainda.</p>
                 ) : (
                   projetosFiltrados.filter(p => p.provaProfessorIA && p.provaProfessorIA.includes("###GABARITO###")).map(p => (
                     <div key={p.id} className="bg-gray-100 p-4 border-4 border-black">
                       <p className="font-black uppercase mb-2 border-b-2 border-gray-300 pb-1">GRUPO: {p.nomeGrupo} <span className="text-xs font-normal text-gray-500">({p.empresa})</span></p>
                       <div className="whitespace-pre-wrap font-bold text-green-700">{p.provaProfessorIA.split("###GABARITO###")[1].trim()}</div>
                     </div>
                   ))
                 )}
               </div>

               <button 
                  onClick={() => {
                    const gruposComGabarito = projetosFiltrados.filter(p => p.provaProfessorIA && p.provaProfessorIA.includes("###GABARITO###"));
                    if(gruposComGabarito.length === 0) {
                      alert("Gere as provas dos grupos primeiro!");
                      return;
                    }
                    const compendium = gruposComGabarito.map(p => `GRUPO: ${p.nomeGrupo} (${p.empresa})\n${p.provaProfessorIA.split("###GABARITO###")[1].trim()}`).join('\n\n------------------------\n\n');
                    navigator.clipboard.writeText(`GABARITOS OFICIAIS - TURMA: ${atividadeSelecionada.turma}\n\n${compendium}`).then(() => alert("Todos os gabaritos copiados com sucesso!"));
                  }} 
                  className={`${btnBrutal} bg-lime-400 w-full py-4`}
                >
                  📋 Copiar Todos os Gabaritos da Turma
               </button>
            </div>
          </div>
        )}

        {/* MODAL DA CENTRAL DE PROVAS UNITÁRIAS DO GRUPO */}
        {grupoExameFoco && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white border-8 border-black p-6 w-full max-w-3xl shadow-[12px_12px_0px_black] space-y-6 relative max-h-[90vh] overflow-y-auto">
               
               <button onClick={() => setGrupoExameFoco(null)} className="absolute top-4 right-4 border-4 border-black p-1 bg-red-500 text-white font-black hover:bg-red-600">
                 <X size={20}/>
               </button>

               <div className="bg-orange-400 p-4 border-4 border-black shadow-[4px_4px_0px_black]">
                 <span className="bg-black text-white text-xs font-black px-2 py-0.5 uppercase">Central do Professor</span>
                 <h3 className="text-2xl font-black uppercase text-black mt-2">Provas: {grupoExameFoco.nomeGrupo}</h3>
                 <p className="text-xs font-bold text-black mt-1">Empresa: {grupoExameFoco.empresa} | Alunos ({grupoExameFoco.alunos?.length}): {grupoExameFoco.alunos?.join(", ")}</p>
               </div>

               {(!grupoExameFoco.provaProfessorIA || !grupoExameFoco.provaProfessorIA.includes("###GABARITO###")) ? (
                 <div className="space-y-4 py-4">
                   <p className="text-sm font-bold bg-yellow-100 p-3 border-2 border-black">Este grupo ainda não possui uma avaliação construída pelo robô. Clique no gatilho abaixo para mapear as 6 questões oficiais.</p>
                   <button 
                     onClick={() => gerarProvaDoGrupoFoco(grupoExameFoco)} 
                     disabled={isProvaWait} 
                     className={`${btnBrutal} bg-black text-white w-full py-4`}
                   >
                     {isProvaWait ? "CONSTRUINDO QUESTIONÁRIO SOB MEDIDA (6 QUESTÕES)..." : "🤖 GERAR PROVA DIRECIONADA DESTE GRUPO"}
                   </button>
                 </div>
               ) : (
                 <div className="space-y-4">
                    
                    <div className="bg-yellow-200 p-4 border-4 border-black flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-[4px_4px_0px_black]">
                      <label className="font-black uppercase text-sm whitespace-nowrap">Visualizar Folha do Aluno:</label>
                      <select 
                        value={alunoSelecionadoProva} 
                        onChange={(e) => setAlunoSelecionadoProva(e.target.value)} 
                        className="p-2 border-4 border-black font-black text-sm bg-white w-full outline-none"
                      >
                        {grupoExameFoco.alunos?.map((aluno, i) => (
                          <option key={i} value={aluno}>{aluno}</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-white p-6 border-4 border-black font-serif text-sm leading-relaxed max-h-64 overflow-y-auto select-all shadow-[inset_0_0_8px_black]">
                       {grupoExameFoco.provaProfessorIA.split("###GABARITO###")[0].replace(/\[NOME_DO_ALUNO\]/g, alunoSelecionadoProva)}
                    </div>

                    <div className="bg-black text-white p-4 border-4 border-gray-600 font-mono text-xs">
                      <p className="text-lime-400 font-black uppercase mb-1">✓ CHAVE DE RESPOSTAS (GABARITO MESTRE):</p>
                      {grupoExameFoco.provaProfessorIA.split("###GABARITO###")[1] || "Gabarito não estruturado."}
                    </div>

                    <div className="flex flex-col gap-4 pt-2">
                      
                      <div className="flex flex-wrap gap-4 items-center">
                        <button 
                          onClick={() => {
                            const provaPronta = grupoExameFoco.provaProfessorIA.split("###GABARITO###")[0].replace(/\[NOME_DO_ALUNO\]/g, alunoSelecionadoProva);
                            navigator.clipboard.writeText(provaPronta).then(() => alert(`Prova unitária de ${alunoSelecionadoProva} copiada!`));
                          }} 
                          className={`${btnBrutal} bg-lime-400 flex-1`}
                        >
                          📋 Copiar Somente: {alunoSelecionadoProva?.split(" ")[0]}
                        </button>
                        
                        <button 
                          onClick={() => gerarProvaDoGrupoFoco(grupoExameFoco)} 
                          disabled={isProvaWait}
                          className="text-xs font-black uppercase underline hover:text-red-600 ml-auto"
                        >
                          {isProvaWait ? "REGERANDO..." : "↻ Refazer Questões"}
                        </button>
                      </div>

                      <button 
                          onClick={() => {
                            const provaBase = grupoExameFoco.provaProfessorIA.split("###GABARITO###")[0];
                            let provasCompletas = grupoExameFoco.alunos.map(aluno => 
                              provaBase.replace(/\[NOME_DO_ALUNO\]/g, aluno)
                            ).join("\n\n========================================================================================\n\n");
                            navigator.clipboard.writeText(provasCompletas).then(() => alert(`As provas de TODOS os ${grupoExameFoco.alunos.length} alunos deste grupo foram copiadas!\n\nAgora é só abrir o Word e colar.`));
                          }} 
                          className={`${btnBrutal} bg-cyan-400 w-full py-4 text-sm`}
                        >
                          📚 Copiar Provas de TODOS os Alunos (Lote do Grupo)
                      </button>

                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

      </div>
    );
  }

  // INTERFACE INTERATIVA DO ALUNO (Mantida)
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