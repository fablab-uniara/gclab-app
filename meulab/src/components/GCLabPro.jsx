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
  
  // ESTADOS DA IA
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
    chkOrcamento: false, chkTempo: false, chkManutencao: false,
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
    try {
      const docRef = doc(db, "projetos_gc", idDigitado);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(data);
        setDocId(docSnap.id);
        if(data.feedbackIA) setFeedbackConselho(data.feedbackIA);
      }
    } catch (e) { console.error(e); }
  };

  const copiarLinkDoGrupo = () => {
    const url = `${window.location.origin}?id=${docId}`;
    navigator.clipboard.writeText(url);
    alert(`🔗 Link copiado!`);
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

  // FUNÇÃO DO CONSELHO (IA)
  const validarComConselho = async () => {
    if (!formData.f1AcaoEngajamento || !formData.f2Ferramenta) {
      alert("Preencha o plano de implantação antes de consultar o conselho!");
      return;
    }

    setIsIAWait(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const textoIA = data.candidates[0].content.parts[0].text;
      setFeedbackConselho(textoIA);
      setFormData(prev => ({ ...prev, feedbackIA: textoIA }));
      await updateDoc(doc(db, "projetos_gc", docId), { feedbackIA: textoIA });
    } catch (e) {
      console.error(e);
      setFeedbackConselho("O conselho está em reunião. Tente novamente em instantes.");
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
  
  const inputStyle = "w-full p-3 border-4 border-black bg-white focus:bg-yellow-100 outline-none shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all font-bold text-black text-sm";
  const btnBrutal = "px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-2";

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-pink-500 p-4 md:p-10">
        <div className="max-w-6xl mx-auto bg-white border-8 border-black p-4 md:p-8 shadow-[15px_15px_0px_black]">
          <div className="flex justify-between items-center mb-10 border-b-8 border-black pb-4">
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
    <div className="min-h-screen bg-pink-500 p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto bg-white border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)]">
        
        <div className="bg-yellow-400 p-6 border-b-4 border-black flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <img src={uniaraLogo} alt="Uniara" className="h-12 border-4 border-black bg-white" />
             <div>
                <h1 className="text-3xl font-black uppercase">GC-LAB 4.0</h1>
                <p className="text-black font-bold text-[10px] bg-white px-2 border-2 border-black">CONSELHO IA ATIVADO</p>
             </div>
          </div>
          <div className="flex gap-3">
            {docId && <button onClick={copiarLinkDoGrupo} className="bg-white p-2 border-2 border-black text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_black]">Link</button>}
            <button onClick={carregarProjetosProfessor} className={`p-2 border-2 border-black text-xs font-black shadow-[2px_2px_0px_black] ${isAdminAuth ? 'bg-purple-600 text-white' : 'bg-black text-white'}`}>Professor</button>
            <div className="font-black text-xl bg-white px-4 py-2 border-4 border-black">ETAPA {step}/5</div>
          </div>
        </div>

        <div className="p-4 md:p-10 bg-gray-50">
          {isSaving && <div className="fixed bottom-5 right-5 bg-black text-lime-400 p-4 border-4 border-lime-400 font-black z-50">SALVANDO...</div>}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1"><label className="font-black uppercase text-[11px]">Grupo</label><input type="text" name="nomeGrupo" value={formData.nomeGrupo} onChange={handleChange} className={inputStyle} /></div>
                <div><label className="font-black uppercase text-[11px]">Empresa</label><input type="text" name="empresa" value={formData.empresa} onChange={handleChange} className={inputStyle} /></div>
                <div><label className="font-black uppercase text-[11px]">Área</label><input type="text" name="area" value={formData.area} onChange={handleChange} className={inputStyle} /></div>
              </div>
              <div className="border-4 border-black p-4 bg-white">
                <label className="font-black uppercase block mb-2 italic">Equipe</label>
                <div className="flex gap-2 mb-4">
                  <input type="text" value={tempAluno} onChange={(e) => setTempAluno(e.target.value)} className={inputStyle} />
                  <button onClick={addAluno} className="bg-lime-400 px-6 border-4 border-black font-black">+</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {formData.alunos.map((aluno, i) => <div key={i} className="bg-gray-100 border-2 border-black p-2 font-bold text-xs uppercase">{aluno}</div>)}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-6">
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
            <div className="space-y-6">
              <div className="border-4 border-black p-6 bg-red-100">
                <label className="font-black uppercase block mb-2 text-xl">O Problema Central</label>
                <textarea name="gapPrincipal" value={formData.gapPrincipal} onChange={handleChange} className={inputStyle} rows="4"></textarea>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-100 p-4 border-4 border-black"><h4 className="font-black mb-2 uppercase">Fase 1: Sensibilização</h4><input type="text" name="f1AcaoEngajamento" value={formData.f1AcaoEngajamento} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-orange-100 p-4 border-4 border-black"><h4 className="font-black mb-2 uppercase">Fase 2: Tecnologia</h4><input type="text" name="f2Ferramenta" value={formData.f2Ferramenta} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-pink-100 p-4 border-4 border-black"><h4 className="font-black mb-2 uppercase">Fase 3: Piloto</h4><input type="text" name="f3SetorPiloto" value={formData.f3SetorPiloto} onChange={handleChange} className={inputStyle} /></div>
                <div className="bg-lime-100 p-4 border-4 border-black"><h4 className="font-black mb-2 uppercase">Fase 4: Sustentação</h4><input type="text" name="f4NovaRotina" value={formData.f4NovaRotina} onChange={handleChange} className={inputStyle} /></div>
              </div>

              {/* PAINEL DA IA - CONSELHO EXECUTIVO */}
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

                <button 
                  onClick={validarComConselho} 
                  disabled={isIAWait}
                  className={`${btnBrutal} bg-lime-400 text-black w-full justify-center disabled:opacity-50`}
                >
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

              <div className="p-6 bg-red-400 border-4 border-black space-y-3 font-bold">
                 <label className="flex items-center gap-3"><input type="checkbox" name="chkOrcamento" checked={formData.chkOrcamento} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> Recurso disponível?</label>
                 <label className="flex items-center gap-3"><input type="checkbox" name="chkTempo" checked={formData.chkTempo} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> Tempo na rotina?</label>
                 <label className="flex items-center gap-3"><input type="checkbox" name="chkManutencao" checked={formData.chkManutencao} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> Resolve a dor?</label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div id="printArea" className="bg-white p-10 border-8 border-black font-mono">
               <div className="flex justify-between items-center mb-8 border-b-8 border-black pb-6">
                  <h1 className="text-3xl font-black uppercase bg-black text-white p-4 grow text-center mx-10">Roadmap Executivo GC</h1>
               </div>
               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 border-4 border-black p-4 bg-gray-50 font-black uppercase italic">
                     <p>Cliente: {formData.empresa}</p>
                     <p>Equipe: {formData.alunos.join(", ")}</p>
                  </div>
                  <div className="border-4 border-black p-4 bg-red-100">
                    <h3 className="font-black uppercase mb-2 underline">Problema Central:</h3>
                    <p className="font-bold">{formData.gapPrincipal}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="border-4 border-black p-4"><p className="font-black italic mb-1">Fase 1</p><p className="text-xs">{formData.f1AcaoEngajamento}</p></div>
                     <div className="border-4 border-black p-4"><p className="font-black italic mb-1">Fase 2</p><p className="text-xs">{formData.f2Ferramenta}</p></div>
                     <div className="border-4 border-black p-4"><p className="font-black italic mb-1">Fase 3</p><p className="text-xs">{formData.f3SetorPiloto}</p></div>
                     <div className="border-4 border-black p-4"><p className="font-black italic mb-1">Fase 4</p><p className="text-xs">{formData.f4NovaRotina}</p></div>
                  </div>
                  {formData.feedbackIA && (
                    <div className="border-4 border-black p-4 bg-yellow-50">
                      <h3 className="font-black uppercase text-xs mb-2">Parecer do Conselho Executivo:</h3>
                      <p className="text-[10px] italic font-bold">{formData.feedbackIA}</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          <div className="mt-12 flex justify-between gap-4 no-print">
            {step > 1 && <button onClick={() => setStep(step - 1)} className={`${btnBrutal} bg-white`}>Voltar</button>}
            
            {step < 4 ? (
              <button onClick={() => salvarNoFirebase(step + 1)} className={`${btnBrutal} bg-cyan-400`}>Avançar</button>
            ) : step === 4 ? (
              <button 
                onClick={() => salvarNoFirebase(5)} 
                disabled={!(formData.chkOrcamento && formData.chkTempo && formData.chkManutencao && formData.evidenciaUrl && formData.feedbackIA)}
                className={`${btnBrutal} bg-lime-400 disabled:opacity-50`}
              >
                Gerar Projeto Executivo
              </button>
            ) : (
              <button onClick={() => window.print()} className={`${btnBrutal} bg-black text-white`}>Imprimir PDF</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}