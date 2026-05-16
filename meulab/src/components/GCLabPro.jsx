import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Lightbulb, ClipboardCheck, Rocket, UploadCloud, Link, Users, Eye, MessageSquareQuote, ShieldCheck } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// LOGOS
import uniaraLogo from '../assets/uniaralogo.jpg';
import gbxLogo from '../assets/gbxlogo.jpg';

export default function GCLabPro() {
  const [step, setStep] = useState(1);
  const [docId, setDocId] = useState(null);
  const [tempAluno, setTempAluno] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [projetosRemotos, setProjetosRemotos] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [feedbackConselho, setFeedbackConselho] = useState("");
  const [isIAWait, setIsIAWait] = useState(false);

  const [formData, setFormData] = useState({
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
    evidenciaUrl: '', feedbackIA: ''
  });

  const presets = {
    pessoas: ["Resistência", "Heróis do Conhecimento", "Falta de tempo", "Cultura de punição", "Alta rotatividade"],
    processos: ["Onboarding informal", "Manuais desatualizados", "Depende de memória", "Retrabalho", "Sem lições aprendidas"],
    tecnologia: ["Silos no WhatsApp", "Sistemas difíceis", "Sem base central", "Busca ineficiente", "Muitas planilhas"]
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) carregarProjetoPeloId(id);
  }, []);

  const carregarProjetoPeloId = async (idDigitado) => {
    if (!idDigitado) return;
    const cleanId = idDigitado.includes('?id=') ? idDigitado.split('?id=')[1].split('&')[0].trim() : idDigitado.trim();
    try {
      const docRef = doc(db, "projetos_gc", cleanId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(data);
        setDocId(docSnap.id);
        if(data.feedbackIA) setFeedbackConselho(data.feedbackIA);
        window.history.replaceState(null, '', `?id=${docSnap.id}`);
      } else {
        alert("Projeto não encontrado! Verifique o código ou link informado.");
      }
    } catch (e) { 
      console.error(e);
      alert("Erro ao conectar com o banco de dados.");
    }
  };

  const copiarLinkDoGrupo = () => {
    const url = `${window.location.origin}?id=${docId}`;
    navigator.clipboard.writeText(url);
    alert(`🔗 Link copiado com sucesso!`);
  };

  const salvarNoFirebase = async (proximoPasso) => {
    setIsSaving(true);
    try {
      const payload = { ...formData, updatedAt: serverTimestamp() };
      if (!docId) {
        const docRef = await addDoc(collection(db, "projetos_gc"), { ...payload, createdAt: serverTimestamp(), status: 'em_andamento' });
        setDocId(docRef.id);
        window.history.replaceState(null, '', `?id=${docRef.id}`);
      } else {
        await updateDoc(doc(db, "projetos_gc", docId), payload);
      }
      if (proximoPasso) setStep(proximoPasso);
    } catch (e) { console.error(e); }
    setIsSaving(false);
  };

  const validarComConselho = async () => {
    if (!formData.f1AcaoEngajamento || !formData.f2Ferramenta) {
      alert("Preencha o plano de implantação antes de consultar o conselho!");
      return;
    }
    setIsIAWait(true);
    const prompt = `Aja como um conselho executivo socrático rigoroso. 
    Analise este projeto de Gestão do Conhecimento:
    - Empresa: ${formData.empresa}
    - Problema: ${formData.gapPrincipal}
    - Fase 1 (Engajamento): ${formData.f1AcaoEngajamento}
    - Fase 2 (Tecnologia): ${formData.f2Ferramenta}
    - Fase 3 (Piloto): ${formData.f3SetorPiloto}
    - Fase 4 (Sustentação): ${formData.f4NovaRotina}
    
    Devolva exatamente 3 perguntas curtas e provocativas que desafiem a viabilidade prática desse plano. 
    Seja direto, crítico e use tom profissional. Não dê parabéns.`;

    try {
      const response = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const textoIA = data.candidates[0].content.parts[0].text;
      setFeedbackConselho(textoIA);
      setFormData(prev => ({ ...prev, feedbackIA: textoIA }));
      await updateDoc(doc(db, "projetos_gc", docId), { feedbackIA: textoIA });
    } catch (e) {
      console.error(e);
      setFeedbackConselho("O conselho está em reunião. Erro de comunicação com o servidor.");
    }
    setIsIAWait(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileRef = ref(storage, `evidencias_gc/${docId}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);
    setIsSaving(true);
    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => { console.error(error); setIsSaving(false); },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          setFormData({ ...formData, evidenciaUrl: url });
          setIsSaving(false);
          setUploadProgress(0);
          updateDoc(doc(db, "projetos_gc", docId), { evidenciaUrl: url, updatedAt: serverTimestamp() });
        });
      }
    );
  };

  const carregarProjetosProfessor = async () => {
    if (!isAdminAuth) {
      const senha = prompt("Senha do professor:");
      if (senha !== "uniara2024") return;
      setIsAdminAuth(true);
    }
    const q = query(collection(db, "projetos_gc"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    setProjetosRemotos(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    setShowAdmin(true);
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
  const btnBrutal = "px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-2";

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-pink-500 p-4 md:p-10 print:bg-white print:p-0">
        <div className="max-w-6xl mx-auto bg-white border-8 border-black p-4 md:p-8 shadow-[15px_15px_0px_black] print:border-none print:shadow-none">
          <div className="flex justify-between items-center mb-10 border-b-8 border-black pb-4 print:hidden">
             <h1 className="text-3xl font-black uppercase">Painel Professor</h1>
             <button onClick={() => setShowAdmin(false)} className={`${btnBrutal} bg-red-400`}>Sair</button>
          </div>
          <div className="grid gap-6">
            {projetosRemotos.map(p => (
              <div key={p.id} className="border-4 border-black p-6 bg-yellow-50 shadow-[6px_6px_0px_black] flex justify-between items-center">
                <div>
                  <p className="text-2xl font-black">{p.nomeGrupo || "Sem Nome"} - {p.empresa}</p>
                  <p className="font-bold text-gray-600">ID: {p.id}</p>
                </div>
                <button onClick={() => { setFormData(p); setDocId(p.id); setFeedbackConselho(p.feedbackIA || ""); setShowAdmin(false); setStep(5); }} className={`${btnBrutal} bg-cyan-400`}>Abrir</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    // CLASSES DE IMPRESSÃO ADICIONADAS AQUI (print:bg-white print:p-0)
    <div className="min-h-screen bg-pink-500 p-4 md:p-10 font-sans print:bg-white print:p-0">
      
      {/* MÁXIMA LARGURA E BORDAS DESATIVADAS NA IMPRESSÃO */}
      <div className="max-w-5xl mx-auto bg-white border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)] print:border-none print:shadow-none print:max-w-none print:m-0">
        
        {/* CABEÇALHO DO JOGO (ESCONDIDO NA IMPRESSÃO) */}
        <div className="bg-yellow-400 p-6 border-b-4 border-black flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
          <div className="flex items-center gap-4">
             <img src={uniaraLogo} alt="Uniara" className="h-12 border-4 border-black bg-white" />
             <div>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black">GC-LAB 4.0</h1>
                <p className="text-black font-bold text-[10px] md:text-xs bg-white inline-block px-2 border-2 border-black">CONSELHO IA ATIVADO</p>
             </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 items-center">
            {docId && (
              <button onClick={copiarLinkDoGrupo} className="bg-white text-black p-2 border-2 border-black text-xs uppercase font-black flex items-center gap-2 shadow-[2px_2px_0px_black] active:translate-y-1 active:translate-x-1 hover:bg-cyan-200 transition-all">
                <Link size={16} /> Copiar Link
              </button>
            )}
            <button onClick={carregarProjetosProfessor} className={`p-2 border-2 border-black text-xs uppercase font-black flex items-center gap-2 shadow-[2px_2px_0px_black] active:translate-y-1 active:translate-x-1 transition-all ${isAdminAuth ? 'bg-purple-600 text-white' : 'bg-black text-white'}`}>
              {isAdminAuth ? "📋 Voltar ao Painel" : <><Users size={14} /> Professor</>}
            </button>
            <div className="font-black text-lg md:text-xl text-black bg-white px-3 py-2 border-4 border-black shadow-[4px_4px_0px_black]">ETAPA {step}/5</div>
          </div>
        </div>

        <div className="p-4 md:p-10 bg-gray-50 print:bg-white print:p-0">
          {isSaving && <div className="fixed bottom-5 right-5 bg-black text-lime-400 p-4 border-4 border-lime-400 font-black z-50 print:hidden">SALVANDO...</div>}

          {step === 1 && (
            <div className="space-y-6 print:hidden">
              {!docId && (
                <div className="border-4 border-black p-4 bg-orange-100 shadow-[4px_4px_0px_black] flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-black uppercase text-lg">Já tem um projeto?</h3>
                    <p className="text-xs font-bold">Cole o código ou o link completo da sua equipe para continuar.</p>
                  </div>
                  <div className="flex w-full md:w-auto">
                    <input type="text" id="inputCodigo" placeholder="Cole aqui..." className="p-2 border-4 border-black outline-none font-bold text-sm w-full" />
                    <button onClick={() => carregarProjetoPeloId(document.getElementById('inputCodigo').value)} className="bg-black text-white px-4 font-black uppercase text-sm border-y-4 border-r-4 border-black hover:bg-gray-800 transition-all">Entrar</button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1"><label className="font-black uppercase text-[11px]">Grupo</label><input type="text" name="nomeGrupo" value={formData.nomeGrupo} onChange={handleChange} className={inputStyle} /></div>
                <div><label className="font-black uppercase text-[11px]">Empresa</label><input type="text" name="empresa" value={formData.empresa} onChange={handleChange} className={inputStyle} /></div>
                <div><label className="font-black uppercase text-[11px]">Área</label><input type="text" name="area" value={formData.area} onChange={handleChange} className={inputStyle} /></div>
              </div>
              <div className="border-4 border-black p-4 bg-white">
                <label className="font-black uppercase block mb-2 italic">Equipe</label>
                <div className="flex gap-2 mb-4">
                  <input type="text" value={tempAluno} onChange={(e) => setTempAluno(e.target.value)} className={inputStyle} />
                  <button onClick={addAluno} className="bg-lime-400 px-6 border-4 border-black font-black hover:bg-lime-500 transition-all">+</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {formData.alunos.map((aluno, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-100 border-2 border-black p-2 font-bold text-xs uppercase">
                      {aluno}
                      <button onClick={() => removeAluno(i)} className="text-red-600 hover:scale-110 transition-all"><Trash2 size={16}/></button>
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
              <div className="border-4 border-black p-6 bg-red-100">
                <label className="font-black uppercase block mb-2 text-xl">O Problema Central</label>
                <textarea name="gapPrincipal" value={formData.gapPrincipal} onChange={handleChange} className={inputStyle} rows="4"></textarea>
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
                 <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2"><UploadCloud size={24} /> Evidência de Campo</h3>
                 {!formData.evidenciaUrl ? (
                   <label className="cursor-pointer bg-black text-white px-6 py-4 font-black uppercase flex justify-center items-center gap-2 border-4 border-black">
                     <UploadCloud size={20} /> Anexar Foto/Documento
                     <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                   </label>
                 ) : (
                   <div className="bg-lime-400 p-4 border-4 border-black font-black uppercase flex justify-between items-center">
                     ✅ ARQUIVO ANEXADO
                     <a href={formData.evidenciaUrl} target="_blank" rel="noreferrer" className="text-xs bg-black text-white px-3 py-2 border-2 border-white">Ver</a>
                   </div>
                 )}
              </div>

              <div className="p-6 bg-red-400 border-4 border-black space-y-4">
                <div>
                   <h3 className="text-xl font-black uppercase flex items-center gap-2">Filtro de Realidade</h3>
                   <p className="text-xs font-bold bg-white p-3 border-2 border-black mt-2 leading-relaxed">
                      <span className="text-red-600 font-black">Atenção, Consultores:</span> Um plano no papel aceita tudo. Para aprovar o projeto, vocês precisam provar que ele sobrevive no mundo corporativo. Marque as opções e justifique detalhadamente como resolverão cada barreira.
                   </p>
                </div>
                <div className="space-y-4 bg-white p-4 border-4 border-black">
                   <div className="space-y-2">
                     <label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkOrcamento" checked={formData.chkOrcamento} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 1. Recurso Disponível?</label>
                     {formData.chkOrcamento && <textarea name="justOrcamento" value={formData.justOrcamento} onChange={handleChange} placeholder="Justifique: A empresa possui orçamento liberado ou infraestrutura física/digital para bancar a ferramenta da Fase 2? De onde sairá o recurso?" className={inputStyle} rows="2"></textarea>}
                   </div>
                   <div className="space-y-2">
                     <label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkTempo" checked={formData.chkTempo} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 2. Tempo na Rotina?</label>
                     {formData.chkTempo && <textarea name="justTempo" value={formData.justTempo} onChange={handleChange} placeholder="Justifique: A equipe terá tempo hábil durante o expediente normal para alimentar essa nova rotina? Como isso será encaixado no dia a dia?" className={inputStyle} rows="2"></textarea>}
                   </div>
                   <div className="space-y-2">
                     <label className="flex items-center gap-3 font-black uppercase text-sm"><input type="checkbox" name="chkManutencao" checked={formData.chkManutencao} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> 3. Resolve a Dor?</label>
                     {formData.chkManutencao && <textarea name="justManutencao" value={formData.justManutencao} onChange={handleChange} placeholder="Justifique: Explique como essa solução elimina EXATAMENTE o Problema Central que vocês mapearam lá na Etapa 3." className={inputStyle} rows="2"></textarea>}
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 5 - NOVO DESIGN CORPORATIVO (Mckinsey/BCG Style) PARA IMPRESSÃO */}
          {/* ========================================================================= */}
          {step === 5 && (
            <div id="printArea" className="bg-white p-8 md:p-12 border border-gray-200 font-sans text-gray-800 mx-auto max-w-4xl shadow-md print:border-none print:shadow-none print:max-w-full">
              
              {/* CABEÇALHO DO RELATÓRIO */}
              <div className="flex justify-between items-center border-b-2 border-blue-900 pb-6 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wider">Projeto Executivo</h1>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">Gestão do Conhecimento</h2>
                </div>
                <img src={uniaraLogo} alt="Uniara" className="h-12 opacity-90" />
              </div>

              {/* DADOS DO PROJETO */}
              <div className="grid grid-cols-2 gap-6 mb-10 text-sm">
                <div>
                  <p className="text-gray-400 uppercase text-[10px] font-bold tracking-widest mb-1">Empresa / Setor Foco</p>
                  <p className="font-bold text-lg text-gray-900">{formData.empresa} <span className="font-normal text-gray-500 text-sm">({formData.area})</span></p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase text-[10px] font-bold tracking-widest mb-1">Consultores (Equipe)</p>
                  <p className="font-medium text-gray-800">{formData.alunos.join(", ")}</p>
                </div>
              </div>

              {/* PROBLEMA CENTRAL */}
              <div className="mb-10">
                <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">1. Diagnóstico e Problema Central</h3>
                <p className="text-gray-800 text-base leading-relaxed bg-gray-50 p-5 border-l-4 border-blue-900 italic">
                  "{formData.gapPrincipal}"
                </p>
              </div>

              {/* ROADMAP */}
              <div className="mb-10">
                <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">2. Roadmap de Implantação</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-sm">
                    <p className="text-[10px] font-bold text-blue-800 uppercase mb-2 tracking-wider">Fase 1: Sensibilização</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{formData.f1AcaoEngajamento}</p>
                  </div>
                  <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-sm">
                    <p className="text-[10px] font-bold text-blue-800 uppercase mb-2 tracking-wider">Fase 2: Tecnologia</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{formData.f2Ferramenta}</p>
                  </div>
                  <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-sm">
                    <p className="text-[10px] font-bold text-blue-800 uppercase mb-2 tracking-wider">Fase 3: Piloto</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{formData.f3SetorPiloto}</p>
                  </div>
                  <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-sm">
                    <p className="text-[10px] font-bold text-blue-800 uppercase mb-2 tracking-wider">Fase 4: Sustentação</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{formData.f4NovaRotina}</p>
                  </div>
                </div>
              </div>

              {/* VIABILIDADE E PARECER (LADO A LADO) */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* VIABILIDADE */}
                <div>
                  <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">3. Defesa de Viabilidade</h3>
                  <ul className="space-y-4 text-xs text-gray-700 leading-relaxed">
                    <li><strong className="text-gray-900 block mb-1">Recursos e Orçamento:</strong> {formData.justOrcamento}</li>
                    <li><strong className="text-gray-900 block mb-1">Tempo na Rotina:</strong> {formData.justTempo}</li>
                    <li><strong className="text-gray-900 block mb-1">Resolução da Dor:</strong> {formData.justManutencao}</li>
                  </ul>
                </div>

                {/* PARECER IA */}
                <div>
                  <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">4. Parecer do Conselho (IA)</h3>
                  <div className="text-xs text-gray-700 leading-relaxed space-y-2 whitespace-pre-wrap bg-gray-50 p-4 border border-gray-200 rounded-sm">
                    {formData.feedbackIA}
                  </div>
                </div>
              </div>
              {/* ======================================================= */}
              {/* NOVO: ROTEIRO DO PITCH DE 2 MINUTOS */}
              {/* ======================================================= */}
              <div className="mb-8 mt-10 print:mt-8 page-break-inside-avoid">
                <h3 className="text-blue-900 font-bold uppercase text-xs tracking-widest border-b border-gray-300 pb-2 mb-4">
                  🎤 Roteiro de Pitch Sugerido (2 Minutos)
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-sm">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 font-bold">Leia e adapte para a apresentação oral:</p>
                  
                  <div className="space-y-3 text-sm text-gray-800">
                    <p>
                      <strong className="text-blue-900">1. O Gancho (15s):</strong> "Olá, somos a equipe <strong>{formData.nomeGrupo}</strong> e analisamos o setor de <strong>{formData.area}</strong> da <strong>{formData.empresa}</strong>."
                    </p>
                    <p>
                      <strong className="text-blue-900">2. A Dor (30s):</strong> "Identificamos que o principal gargalo travando a produtividade hoje é: <em>{formData.gapPrincipal}</em>."
                    </p>
                    <p>
                      <strong className="text-blue-900">3. A Solução (45s):</strong> "Para resolver isso, não basta só colocar sistema. Vamos começar engajando a equipe com <strong>{formData.f1AcaoEngajamento}</strong>. Em seguida, implementaremos a tecnologia <strong>{formData.f2Ferramenta}</strong>. Para garantir que funcione, faremos um piloto restrito no <strong>{formData.f3SetorPiloto}</strong>."
                    </p>
                    <p>
                      <strong className="text-blue-900">4. A Viabilidade (30s):</strong> "Esse projeto é totalmente viável. Temos tempo na rotina garantido através de <em>{formData.justTempo}</em>, e ele se paga porque elimina diretamente a nossa dor central através de <em>{formData.justManutencao}</em>. Muito obrigado!"
                    </p>
                  </div>
                </div>
              </div>
              {/* ASSINATURA RODAPÉ */}
              <div className="mt-16 text-center text-[10px] text-gray-400 border-t border-gray-200 pt-6">
                <p className="uppercase tracking-widest mb-1">Gerado pelo sistema GC-LAB 4.0 - Laboratório de Consultoria</p>
                <p>NITE - Uniara • {new Date().toLocaleDateString('pt-BR')}</p>
              </div>

            </div>
          )}

          {/* BOTÕES ESCONDIDOS NA IMPRESSÃO (print:hidden) */}
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
                  formData.evidenciaUrl && formData.feedbackIA
                )} 
                className={`${btnBrutal} bg-lime-400 disabled:opacity-50`}
              >
                Gerar Projeto Executivo
              </button>
            ) : (
              <button onClick={() => window.print()} className={`${btnBrutal} bg-black text-white hover:bg-gray-800`}>
                🖨️ Imprimir / Salvar PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}