import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Lightbulb, ClipboardCheck, Rocket, UploadCloud, Link, Users, Eye, MessageSquareQuote, ShieldCheck, FolderPlus, ArrowLeft, CheckCircle, Clock, History } from 'lucide-react';
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
  
  // Formulário para criar atividade
  const [novaAtivNome, setNovaAtivNome] = useState("");
  const [novaAtivTurma, setNovaAtivTurma] = useState("");
  const [novaAtivNotaMax, setNovaAtivNotaMax] = useState("10");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedbackConselho, setFeedbackConselho] = useState("");
  const [isIAWait, setIsIAWait] = useState(false);
  const [isIAProfWait, setIsIAProfWait] = useState(false);

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
    evidencias: [], feedbackIA: '', avaliacaoProfessorIA: '',
    notaFinal: '', 
    etapaConcluida: 1
  });

  const presets = {
    pessoas: ["Resistência", "Heróis do Conhecimento", "Falta de tempo", "Cultura de punição", "Alta rotatividade"],
    processos: ["Onboarding informal", "Manuais desatualizados", "Depende de memória", "Retrabalho", "Sem lições aprendidas"],
    tecnologia: ["Silos no WhatsApp", "Sistemas difíceis", "Sem base central", "Busca ineficiente", "Muitas planilhas"]
  };

  // NOVA FUNÇÃO: Busca as atividades de forma pública para o menu do aluno
  const buscarAtividadesPublicas = async () => {
    try {
      const qAct = query(collection(db, "atividades_gc"), orderBy("createdAt", "desc"));
      const snapAct = await getDocs(qAct);
      setAtividades(snapAct.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Erro ao carregar lista de atividades", e);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const act = params.get('act');
    if (id) carregarProjetoPeloId(id);
    if (act) setFormData(prev => ({ ...prev, atividadeId: act }));
    
    // Assim que a tela carrega, ele puxa as atividades criadas pelo professor
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
        setFormData(data);
        setDocId(docSnap.id);
        setStep(data.etapaConcluida || 1);
        if(data.feedbackIA) setFeedbackConselho(data.feedbackIA);
        window.history.replaceState(null, '', `?id=${docSnap.id}`);
      } else {
        alert("Código ou ID de projeto não encontrado!");
      }
    } catch (e) { console.error(e); }
  };

  const salvarNoFirebase = async (proximoPasso) => {
    if (!formData.atividadeId && !docId) {
      alert("Erro: Escolha a atividade antes de iniciar um novo projeto.");
      return;
    }
    setIsSaving(true);
    try {
      const novaEtapa = proximoPasso > formData.etapaConcluida ? proximoPasso : formData.etapaConcluida;
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
        nome: novaAtivNome,
        turma: novaAtivTurma,
        notaMaxima: novaAtivNotaMax,
        createdAt: serverTimestamp()
      });
      setNovaAtivNome("");
      setNovaAtivTurma("");
      buscarAtividadesPublicas(); // Recarrega a lista
      alert("Atividade criada com sucesso!");
    } catch (e) { console.error(e); }
  };

  const carregarAtividadesDoBanco = async () => {
    if (!isAdminAuth) {
      const senha = prompt("Senha Master do Professor:");
      if (senha !== "uniara2024") return;
      setIsAdminAuth(true);
    }
    await buscarAtividadesPublicas(); // Garante que a lista tá fresquinha
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
      alert("Nota salva com sucesso!");
    } catch (e) { alert("Erro ao salvar nota"); }
  };

  const vincularAtividadeProjetoAntigo = async (pId, actId) => {
    try {
      await updateDoc(doc(db, "projetos_gc", pId), { atividadeId: actId });
      alert("Projeto vinculado com sucesso à atividade!");
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
    const prompt = `Analise criticamente: Problema: ${formData.gapPrincipal}. Solução proposta: Engajamento (${formData.f1AcaoEngajamento}), TI (${formData.f2Ferramenta}), Piloto (${formData.f3SetorPiloto}). Retorne 3 perguntas socráticas duras sobre a viabilidade prática.`;
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
    const prompt = `Aja como um professor avaliador de Gestão do Conhecimento. Analise as respostas deste grupo e indique detalhadamente: 1) Pontos Fortes, 2) Pontos Fracos, 3) Nota Sugerida de 0 a 10 baseado na solidez das respostas. Projeto: Problema: ${formData.gapPrincipal}, Roadmap: ${formData.f1AcaoEngajamento} -> ${formData.f2Ferramenta}, Defesa: ${formData.justOrcamento} / ${formData.justTempo}.`;
    try {
      const response = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      const textoIA = data.candidates[0].content.parts[0].text;
      setFormData(prev => ({ ...prev, avaliacaoProfessorIA: textoIA }));
      await updateDoc(doc(db, "projetos_gc", docId), { avaliacaoProfessorIA: textoIA });
    } catch (e) { alert("Erro de resposta da IA"); }
    setIsIAProfWait(false);
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
        setIsSaving(false);
        setUploadProgress(0);
        updateDoc(doc(db, "projetos_gc", docId), { evidencias: novas });
      });
    });
  };

  const copiarLinkDoGrupo = () => {
    const url = `${window.location.origin}?id=${docId}`;
    navigator.clipboard.writeText(url);
    alert("Link do grupo copiado!");
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

  const inputStyle = "w-full p-3 border-4 border-black bg-white focus:bg-yellow-100 outline-none shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all font-bold text-black text-sm";
  const btnBrutal = "px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-2 text-xs md:text-sm";

  const projetosOrfaos = projetosRemotos.filter(p => !p.atividadeId || p.atividadeId === "");

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-pink-500 p-4 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto bg-white border-4 border-black p-6 shadow-[10px_10px_0px_black]">
          
          <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Ambiente do Professor</h1>
              <p className="text-xs font-bold text-gray-600">NITE / UNIARA — Gestão Centralizada de Atividades</p>
            </div>
            <button onClick={() => setShowAdmin(false)} className={`${btnBrutal} bg-red-400`}>Sair</button>
          </div>

          {!atividadeSelecionada ? (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="bg-yellow-100 p-6 border-4 border-black shadow-[4px_4px_0px_black] h-fit">
                  <h3 className="font-black uppercase text-lg mb-4 flex items-center gap-2"><FolderPlus size={20} /> Nova Atividade</h3>
                  <form onSubmit={criarNovaAtividade} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase mb-1">Nome da Atividade</label>
                      <input type="text" value={novaAtivNome} onChange={(e) => setNovaAtivNome(e.target.value)} placeholder="Ex: Projeto Integrador I" className="w-full p-2 border-2 border-black font-bold text-sm bg-white" required />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase mb-1">Turma / Curso</label>
                      <input type="text" value={novaAtivTurma} onChange={(e) => setNovaAtivTurma(e.target.value)} placeholder="Ex: ADM 7ª Semestre" className="w-full p-2 border-2 border-black font-bold text-sm bg-white" required />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase mb-1">Nota Máxima da Rodada</label>
                      <input type="number" value={novaAtivNotaMax} onChange={(e) => setNovaAtivNotaMax(e.target.value)} className="w-full p-2 border-2 border-black font-bold text-sm bg-white" required />
                    </div>
                    <button type="submit" className="w-full bg-black text-white py-2 font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">Cadastrar Atividade</button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-black uppercase text-lg underline">Atividades Ativas</h3>
                  {atividades.length === 0 && <p className="text-sm font-bold text-gray-500 italic">Nenhuma atividade criada ainda.</p>}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {atividades.map(a => (
                      <div key={a.id} className="border-4 border-black p-4 bg-white shadow-[4px_4px_0px_black] flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] bg-purple-200 px-2 py-0.5 border border-black font-black uppercase">{a.turma}</span>
                          <h4 className="text-xl font-black uppercase mt-1 tracking-tight">{a.nome}</h4>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-dashed border-black">
                          <button onClick={() => excluirAtividadeCompleta(a.id)} className="text-red-600 hover:scale-105"><Trash2 size={18} /></button>
                          <button onClick={() => selecionarAtividadeDashboard(a)} className="bg-cyan-300 px-4 py-1.5 border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0px_black]">Ver Dashboard</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-4 border-black p-6 bg-orange-50 shadow-[4px_4px_0px_black] space-y-4">
                <h3 className="font-black uppercase text-lg flex items-center gap-2 text-orange-900"><History size={22}/> Projetos Antigos / Sem Atividade Vinculada ({projetosOrfaos.length})</h3>
                <p className="text-xs font-bold text-gray-600 leading-relaxed">Estes são os projetos iniciados antes da atualização do painel. Você pode avaliá-los diretamente ou associá-los a uma atividade criada acima para organizá-los.</p>
                
                {projetosOrfaos.length === 0 ? (
                  <p className="text-xs italic text-gray-500 font-bold">Nenhum projeto antigo pendente de vinculação.</p>
                ) : (
                  <div className="space-y-3">
                    {projetosOrfaos.map(p => (
                      <div key={p.id} className="bg-white border-2 border-black p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm font-bold shadow-[2px_2px_0px_black]">
                        <div>
                          <p className="uppercase text-base font-black">{p.nomeGrupo || "Grupo Sem Nome"} <span className="text-xs font-normal text-gray-500">({p.empresa || "Sem Empresa"})</span></p>
                          <p className="text-[10px] text-gray-400 font-mono">ID Único: {p.id}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] uppercase font-black text-gray-500">Mover para:</label>
                            <select 
                              onChange={(e) => {
                                if(e.target.value) vincularAtividadeProjetoAntigo(p.id, e.target.value);
                              }}
                              className="p-1 border border-black text-xs font-bold bg-yellow-50"
                              defaultValue=""
                            >
                              <option value="" disabled>-- Selecionar --</option>
                              {atividades.map(a => (
                                <option key={a.id} value={a.id}>{a.nome} ({a.turma})</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={() => excluirProjetoDoDashboard(p.id)} className="text-red-500 hover:scale-110 p-1"><Trash2 size={16}/></button>
                            <button onClick={() => { setFormData(p); setDocId(p.id); setFeedbackConselho(p.feedbackIA || ""); setShowAdmin(false); setStep(5); }} className="bg-black text-white px-3 py-1 border-2 border-black uppercase text-xs font-black flex items-center gap-1">
                              <Eye size={12}/> Abrir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-xs font-black uppercase cursor-pointer text-purple-900 hover:underline" onClick={() => setAtividadeSelecionada(null)}>
                <ArrowLeft size={16} /> Voltar para lista de atividades
              </div>

              <div className="bg-purple-900 text-white p-6 border-4 border-black shadow-[4px_4px_0px_black]">
                <span className="text-xs font-mono tracking-widest uppercase opacity-70">{atividadeSelecionada.turma}</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase">{atividadeSelecionada.nome}</h2>
                <p className="text-xs font-bold mt-2 text-yellow-300">Valor Máximo da Rodada: {atividadeSelecionada.notaMaxima} pontos</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-black uppercase text-lg">Mapeamento de Grupos ({projetosFiltrados.length})</h3>
                {projetosFiltrados.length === 0 && <p className="text-sm font-bold text-gray-500 italic py-6">Nenhum grupo vinculou-se a essa atividade ainda.</p>}
                
                <div className="space-y-4">
                  {projetosFiltrados.map(p => {
                    const isConcluido = p.etapaConcluida === 5;
                    const isAvaliado = p.notaFinal !== undefined && p.notaFinal !== "";
                    const temParecerIA = p.avaliacaoProfessorIA ? true : false;

                    return (
                      <div key={p.id} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_black] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="grow space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-black uppercase">{p.nomeGrupo || "Sem Nome"}</h4>
                            <span className="text-[10px] px-2 font-bold bg-gray-100 border border-black">{p.empresa}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-600">Integrantes: {p.alunos?.join(", ")}</p>
                          
                          <div className="flex flex-wrap gap-2 pt-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 border flex items-center gap-1 ${isConcluido ? 'bg-lime-200 text-lime-900 border-lime-600' : 'bg-orange-100 text-orange-900 border-orange-500'}`}>
                              {isConcluido ? <CheckCircle size={12}/> : <Clock size={12}/>}
                              {isConcluido ? 'CONCLUÍDO' : `NA ETAPA ${p.etapaConcluida}`}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 border ${temParecerIA ? 'bg-purple-200 text-purple-900 border-purple-500' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>
                              {temParecerIA ? '🤖 PARECER IA GERADO' : '⏳ SEM PARECER IA'}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 border ${isAvaliado ? 'bg-blue-200 text-blue-900 border-blue-500' : 'bg-red-100 text-red-600 border-red-400'}`}>
                              {isAvaliado ? `✅ AVALIADO` : '❌ NÃO AVALIADO'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end border-t-2 lg:border-t-0 pt-3 lg:pt-0 border-dashed border-gray-300">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-black uppercase">Nota:</label>
                            <input 
                              type="number" 
                              step="0.1"
                              max={atividadeSelecionada.notaMaxima}
                              defaultValue={p.notaFinal || ""} 
                              onBlur={(e) => salvarNotaProfessor(p.id, e.target.value)}
                              placeholder={`0 / ${atividadeSelecionada.notaMaxima}`}
                              className="w-16 p-1 border-2 border-black font-black text-center text-sm bg-yellow-50 shadow-[2px_2px_0px_black]"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={() => excluirProjetoDoDashboard(p.id)} className="text-red-500 p-2 hover:scale-105" title="Excluir Grupo"><Trash2 size={18}/></button>
                            <button onClick={() => { setFormData(p); setDocId(p.id); setFeedbackConselho(p.feedbackIA || ""); setShowAdmin(false); setStep(5); }} className="bg-black text-white px-3 py-1.5 font-black uppercase text-xs border-2 border-black flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                              <Eye size={14}/> Relatório
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
              <button onClick={copiarLinkDoGrupo} className="bg-white text-black p-2 border-2 border-black text-xs uppercase font-black flex items-center gap-2 shadow-[2px_2px_0px_black]">
                <Link size={16} /> Link do Grupo
              </button>
            )}
            <button onClick={carregarAtividadesDoBanco} className="p-2 border-2 border-black text-xs uppercase font-black flex items-center gap-2 shadow-[2px_2px_0px_black] bg-black text-white">
              <Users size={14} /> Professor
            </button>
            <div className="font-black text-lg md:text-xl text-black bg-white px-3 py-2 border-4 border-black shadow-[4px_4px_0px_black]">ETAPA {step}/5</div>
          </div>
        </div>

        <div className="p-4 md:p-10 bg-gray-50 print:bg-white print:p-0">
          {isSaving && <div className="fixed bottom-5 right-5 bg-black text-lime-400 p-4 border-4 border-lime-400 font-black z-50 print:hidden">SALVANDO...</div>}

          {/* O NOVO MENU DE ATIVIDADES PARA O ALUNO */}
          {step === 1 && !formData.atividadeId && !docId && (
            <div className="max-w-md mx-auto my-6 space-y-6 print:hidden">
              <div className="border-4 border-black p-6 bg-yellow-100 shadow-[6px_6px_0px_black] space-y-4">
                <h3 className="text-xl font-black uppercase text-center">Nova Rodada / Atividade</h3>
                <p className="text-xs font-bold text-gray-700 leading-relaxed text-center">Selecione a atividade/turma correspondente na lista abaixo para iniciar o projeto da sua equipe.</p>
                <div className="space-y-2">
                  <select id="codAtivInput" className="w-full p-3 border-4 border-black font-black text-center text-sm outline-none uppercase bg-white shadow-[3px_3px_0px_black]">
                    <option value="">-- ESCOLHA A SUA TURMA --</option>
                    {atividades.map(a => (
                      <option key={a.id} value={a.id}>{a.nome} ({a.turma})</option>
                    ))}
                  </select>
                  <button onClick={() => {
                    const val = document.getElementById('codAtivInput').value;
                    if(val) setFormData(prev => ({ ...prev, atividadeId: val }));
                    else alert("Por favor, selecione uma atividade na lista.");
                  }} className="w-full bg-black text-white font-black py-3 border-4 border-black uppercase text-xs tracking-wide shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-gray-800">Vincular e Iniciar</button>
                </div>
              </div>

              <div className="border-4 border-black p-5 bg-orange-100 shadow-[6px_6px_0px_black] space-y-3">
                <h4 className="font-black uppercase text-sm text-center flex items-center justify-center gap-1"><History size={16}/> Resgatar Projeto Antigo</h4>
                <p className="text-[11px] font-bold text-gray-600 text-center">Se o seu grupo já começou um projeto, digite o Token/ID do Grupo abaixo para carregá-lo.</p>
                <div className="flex">
                  <input type="text" id="inputCodigoAntigo" placeholder="Token / ID do Grupo..." className="p-2 border-4 border-black outline-none font-bold text-xs w-full bg-white" />
                  <button onClick={() => carregarProjetoPeloId(document.getElementById('inputCodigoAntigo').value)} className="bg-orange-500 text-white px-4 font-black uppercase text-xs border-y-4 border-r-4 border-black hover:bg-orange-600">Resgatar</button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (formData.atividadeId || docId) && (
            <div className="space-y-6 print:hidden">
              {!docId && (
                <div className="border-4 border-black p-4 bg-purple-50 shadow-[4px_4px_0px_black] flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-black uppercase text-sm">Entrando na atividade</h3>
                    <p className="text-[11px] font-bold text-purple-900">Se você já criou o grupo nesta atividade e quer apenas continuar, cole o ID do Grupo ao lado.</p>
                  </div>
                  <div className="flex w-full md:w-auto">
                    <input type="text" id="inputCodigo" placeholder="ID do Grupo..." className="p-2 border-4 border-black outline-none font-bold text-xs w-full bg-white" />
                    <button onClick={() => carregarProjetoPeloId(document.getElementById('inputCodigo').value)} className="bg-black text-white px-4 font-black uppercase text-xs border-y-4 border-r-4 border-black">Carregar</button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><label className="font-black uppercase text-[11px]">Nome Fantasia do Grupo</label><input type="text" name="nomeGrupo" value={formData.nomeGrupo} onChange={handleChange} className={inputStyle} /></div>
                <div><label className="font-black uppercase text-[11px]">Empresa Alvo</label><input type="text" name="empresa" value={formData.empresa} onChange={handleChange} className={inputStyle} /></div>
                <div><label className="font-black uppercase text-[11px]">Setor / Área de Negócio</label><input type="text" name="area" value={formData.area} onChange={handleChange} className={inputStyle} /></div>
              </div>
              
              <div className="border-4 border-black p-4 bg-white">
                <label className="font-black uppercase block mb-2 italic">Consultores da Equipe (Máx 6)</label>
                <div className="flex gap-2 mb-4">
                  <input type="text" value={tempAluno} onChange={(e) => setTempAluno(e.target.value)} placeholder="Nome Completo do Aluno..." className={inputStyle} />
                  <button onClick={addAluno} className="bg-lime-400 px-6 border-4 border-black font-black">+</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {formData.alunos.map((aluno, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-100 border-2 border-black p-2 font-bold text-xs uppercase">
                      {aluno}
                      <button onClick={() => removeAluno(i)} className="text-red-600"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {docId && (
                <div className="p-3 bg-gray-900 text-lime-400 font-mono text-[10px] uppercase border-4 border-black select-all">
                  Token Seguro de Acesso do seu Grupo (Guarde e Compartilhe com a Equipe): {docId}
                </div>
              )}
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
              <div className="border-4 border-black p-6 bg-red-100">
                <label className="font-black uppercase block mb-2 text-xl">Mapeamento do Problema Central</label>
                <textarea name="gapPrincipal" value={formData.gapPrincipal} onChange={handleChange} className={inputStyle} rows="4" placeholder="Descreva com foco em negócios qual a principal falha na retenção ou transmissão de conhecimento na organização..."></textarea>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-100 p-4 border-4 border-black"><h4 className="font-black mb-2 uppercase">Fase 1: Sensibilização</h4><input type="text" name="f1AcaoEngajamento" value={formData.f1AcaoEngajamento} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-orange-100 p-4 border-4 border-black"><h4 className="font-black mb-2 uppercase">Fase 2: Tecnologia</h4><input type="text" name="f2Ferramenta" value={formData.f2Ferramenta} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-pink-100 p-4 border-4 border-black"><h4 className="font-black mb-2 uppercase">Fase 3: Piloto</h4><input type="text" name="f3SetorPiloto" value={formData.f3SetorPiloto} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-lime-100 p-4 border-4 border-black"><h4 className="font-black mb-2 uppercase">Fase 4: Sustentação</h4><input type="text" name="f4NovaRotina" value={formData.f4NovaRotina} onChange={handleChange} className={inputStyle} /></div>
              </div>

              <div className="border-8 border-black p-6 bg-black text-white shadow-[8px_8px_0px_#ff00ff]">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck size={32} className="text-lime-400" />
                  <h3 className="text-2xl font-black uppercase italic">Validação do Conselho Executivo</h3>
                </div>
                {feedbackConselho ? (
                  <div className="bg-white text-black p-4 border-4 border-lime-400 font-mono text-sm mb-4 leading-relaxed">
                    <MessageSquareQuote className="mb-2 text-purple-600" size={24} />
                    {feedbackConselho.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                  </div>
                ) : (
                  <p className="text-xs font-bold mb-4 text-gray-400 italic">O conselho aguarda o envio do plano para emitir o parecer técnico.</p>
                )}
                <button onClick={validarComConselho} disabled={isIAWait} className={`${btnBrutal} bg-lime-400 text-black w-full justify-center disabled:opacity-50`}>
                  {isIAWait ? "PROCESSANDO PARECER..." : "SUBMETER AO CONSELHO (IA)"}
                </button>
              </div>

              <div className="p-6 bg-white border-4 border-black">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xl font-black uppercase flex items-center gap-2"><UploadCloud size={24} /> Evidências de Campo</h3>
                   <span className="text-xs font-bold bg-gray-200 px-2 py-1 border-2 border-black">{formData.evidencias?.length || 0}/5 Anexos</span>
                 </div>
                 {(!formData.evidencias || formData.evidencias.length < 5) && (
                   <label className="cursor-pointer bg-black text-white px-6 py-4 font-black uppercase flex justify-center items-center gap-2 border-4 border-black mb-4">
                     <UploadCloud size={20} /> Anexar Foto/Documento
                     <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                   </label>
                 )}
                 {formData.evidencias && formData.evidencias.length > 0 && (
                   <div className="space-y-2">
                     {formData.evidencias.map((arq, idx) => (
                       <div key={idx} className="bg-lime-400 p-3 border-4 border-black font-black uppercase flex justify-between items-center text-xs">
                         <span className="truncate max-w-xs">✅ {arq.nome}</span>
                         <div className="flex gap-2">
                           <a href={arq.url} target="_blank" rel="noreferrer" className="bg-black text-white p-2 border-2 border-white"><Eye size={16}/></a>
                           <button onClick={() => removerEvidencia(idx)} className="bg-red-600 text-white p-2 border-2 border-white"><Trash2 size={16}/></button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>

              <div className="p-6 bg-red-400 border-4 border-black space-y-4">
                <h3 className="text-xl font-black uppercase">Filtro de Realidade</h3>
                <div className="space-y-4 bg-white p-4 border-4 border-black">
                   <div className="space-y-2">
                     <label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkOrcamento" checked={formData.chkOrcamento} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 1. Recurso Disponível?</label>
                     {formData.chkOrcamento && <textarea name="justOrcamento" value={formData.justOrcamento} onChange={handleChange} placeholder="Justifique a viabilidade financeira..." className={inputStyle} rows="2"></textarea>}
                   </div>
                   <div className="space-y-2">
                     <label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkTempo" checked={formData.chkTempo} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 2. Tempo na Rotina?</label>
                     {formData.chkTempo && <textarea name="justTempo" value={formData.justTempo} onChange={handleChange} placeholder="Justifique o encaixe operacional na jornada..." className={inputStyle} rows="2"></textarea>}
                   </div>
                   <div className="space-y-2">
                     <label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkManutencao" checked={formData.chkManutencao} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 3. Resolve a Dor?</label>
                     {formData.chkManutencao && <textarea name="justManutencao" value={formData.justManutencao} onChange={handleChange} placeholder="Justifique o impacto direto no problema central..." className={inputStyle} rows="2"></textarea>}
                   </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div id="printArea" className="bg-white p-8 md:p-12 border border-gray-200 font-sans text-gray-800 mx-auto max-w-4xl shadow-md print:border-none print:shadow-none print:max-w-full">
                
                <div className="flex justify-between items-center border-b-2 border-blue-900 pb-6 mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wider">Projeto Executivo Final</h1>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">Gestão do Conhecimento</h2>
                  </div>
                  <img src={uniaraLogo} alt="Uniara" className="h-12 opacity-90" />
                </div>

                <div className="grid grid-cols-2 gap-6 mb-10 text-sm">
                  <div>
                    <p className="text-gray-400 uppercase text-[10px] font-bold tracking-widest mb-1">Empresa / Setor Foco</p>
                    <p className="font-bold text-lg text-gray-900">{formData.empresa} <span className="font-normal text-gray-500 text-sm">({formData.area || "Geral"})</span></p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase text-[10px] font-bold tracking-widest mb-1">Consultores (Equipe)</p>
                    <p className="font-medium text-gray-800">{formData.alunos.join(", ")}</p>
                  </div>
                </div>

                {formData.notaFinal !== undefined && formData.notaFinal !== "" && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-sm text-sm font-bold text-blue-950 flex justify-between items-center">
                    <span>Métrica de Desempenho / Avaliação do Consultor:</span>
                    <span className="text-xl font-black bg-blue-900 text-white px-4 py-1 rounded-sm">NOTA: {formData.notaFinal}</span>
                  </div>
                )}

                <div className="mb-10">
                  <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">1. Diagnóstico e Problema Central</h3>
                  <p className="text-gray-800 text-base leading-relaxed bg-gray-50 p-5 border-l-4 border-blue-900 italic">"{formData.gapPrincipal}"</p>
                </div>

                <div className="mb-10">
                  <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">2. Roadmap de Implantação</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50/50 p-4 border border-blue-100"><p className="text-[10px] font-bold text-blue-800 uppercase mb-2">Fase 1: Sensibilização</p><p className="text-xs text-gray-700">{formData.f1AcaoEngajamento}</p></div>
                    <div className="bg-blue-50/50 p-4 border border-blue-100"><p className="text-[10px] font-bold text-blue-800 uppercase mb-2">Fase 2: Tecnologia</p><p className="text-xs text-gray-700">{formData.f2Ferramenta}</p></div>
                    <div className="bg-blue-50/50 p-4 border border-blue-100"><p className="text-[10px] font-bold text-blue-800 uppercase mb-2">Fase 3: Piloto</p><p className="text-xs text-gray-700">{formData.f3SetorPiloto}</p></div>
                    <div className="bg-blue-50/50 p-4 border border-blue-100"><p className="text-[10px] font-bold text-blue-800 uppercase mb-2">Fase 4: Sustentação</p><p className="text-xs text-gray-700">{formData.f4NovaRotina}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">3. Defesa de Viabilidade</h3>
                    <ul className="space-y-4 text-xs text-gray-700">
                      <li><strong className="text-gray-900 block mb-1">Recursos e Orçamento:</strong> {formData.justOrcamento}</li>
                      <li><strong className="text-gray-900 block mb-1">Tempo na Rotina:</strong> {formData.justTempo}</li>
                      <li><strong className="text-gray-900 block mb-1">Resolução da Dor:</strong> {formData.justManutencao}</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">4. Parecer do Conselho (IA)</h3>
                    <div className="text-xs text-gray-700 space-y-2 whitespace-pre-wrap bg-gray-50 p-4 border border-gray-200 rounded-sm">{formData.feedbackIA}</div>
                  </div>
                </div>
                
                <div className="mb-8 mt-10 page-break-inside-avoid">
                  <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">🎤 Roteiro de Pitch Sugerido (2 Minutos)</h3>
                  <div className="bg-yellow-50 border border-yellow-200 p-5 text-sm text-gray-800 space-y-2">
                    <p><strong className="text-blue-900">1. O Gancho (15s):</strong> "Somos a equipe {formData.nomeGrupo} focados na área de {formData.area} da {formData.empresa}."</p>
                    <p><strong className="text-blue-900">2. A Dor (30s):</strong> "O gargalo central estratégico identificado foi: {formData.gapPrincipal}."</p>
                    <p><strong className="text-blue-900">3. A Solução (45s):</strong> "Agiremos em ondas através de {formData.f1AcaoEngajamento} e a ferramenta {formData.f2Ferramenta}, homologando um piloto no setor {formData.f3SetorPiloto}."</p>
                    <p><strong className="text-blue-900">4. Viabilidade (30s):</strong> "Garantimos o sucesso operacional porque {formData.justTempo} e {formData.justManutencao}."</p>
                  </div>
                </div>

                <div className="mt-16 text-center text-[10px] text-gray-400 border-t border-gray-200 pt-6">
                  <p className="uppercase tracking-widest">Sistema Analítico GC-LAB 4.0 — NITE UNIARA</p>
                </div>
              </div>

              {isAdminAuth && (
                <div className="mt-8 bg-purple-100 border-4 border-purple-900 p-6 print:hidden shadow-[8px_8px_0px_#4c1d95] mx-auto max-w-4xl space-y-4">
                  <h3 className="text-xl font-black uppercase text-purple-900 flex items-center gap-2">Avaliação do Avaliador</h3>
                  
                  <div className="bg-white p-4 border-2 border-purple-900 flex items-center justify-between text-sm">
                    <span className="font-bold">Vincular a uma Atividade / Turma:</span>
                    <select 
                      value={formData.atividadeId || ""} 
                      onChange={(e) => vincularAtividadeProjetoAntigo(docId, e.target.value)}
                      className="p-2 border-2 border-black font-bold text-xs bg-yellow-50"
                    >
                      <option value="">-- Escolha a Atividade --</option>
                      {atividades.map(a => (
                        <option key={a.id} value={a.id}>{a.nome} ({a.turma})</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-4 border-2 border-purple-900 flex items-center justify-between">
                    <span className="font-bold text-sm">Definir/Modificar Nota da Rodada:</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.1" 
                        value={formData.notaFinal || ""} 
                        onChange={(e) => setFormData({ ...formData, notaFinal: e.target.value })}
                        onBlur={(e) => salvarNotaProfessor(docId, e.target.value)}
                        placeholder="Nota"
                        className="w-20 p-2 border-2 border-black font-black text-center"
                      />
                    </div>
                  </div>

                  {!formData.avaliacaoProfessorIA ? (
                    <button onClick={gerarAvaliacaoProfessor} disabled={isIAProfWait} className={`${btnBrutal} bg-purple-900 text-white w-full justify-center`}>
                      {isIAProfWait ? "PROCESSANDO DOSSIÊ..." : "🤖 SOLICITAR SUPORTE DE CORREÇÃO (IA)"}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white p-6 border-2 border-purple-900 text-sm whitespace-pre-wrap leading-relaxed">{formData.avaliacaoProfessorIA}</div>
                      <button onClick={gerarAvaliacaoProfessor} disabled={isIAProfWait} className="text-xs font-black uppercase underline text-purple-900">A atualizar Parecer da IA</button>
                    </div>
                  )}
                </div>
              )}
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
                  disabled={!(
                    formData.chkOrcamento && formData.justOrcamento?.length > 10 && 
                    formData.chkTempo && formData.justTempo?.length > 10 && 
                    formData.chkManutencao && formData.justManutencao?.length > 10 && 
                    formData.evidencias && formData.evidencias.length > 0 && 
                    formData.feedbackIA
                  )} 
                  className={`${btnBrutal} bg-lime-400 disabled:opacity-50`}
                >
                  Gerar Relatório Executivo
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