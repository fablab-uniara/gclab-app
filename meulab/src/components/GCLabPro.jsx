import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Lightbulb, ClipboardCheck, Rocket, AlertTriangle, Scale, ShieldCheck, Save, Users, Eye, Link } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, orderBy, getDoc } from 'firebase/firestore';

// LOGOS
import uniaraLogo from '../assets/uniaralogo.jpg';
import gbxLogo from '../assets/gbxlogo.jpg';

export default function GCLabPro() {
  const [step, setStep] = useState(1);
  const [docId, setDocId] = useState(null);
  const [tempAluno, setTempAluno] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [projetosRemotos, setProjetosRemotos] = useState([]);
  
  // ESTADO ATUALIZADO COM O CAMPO "nomeGrupo"
  const [formData, setFormData] = useState({
    nomeGrupo: '', empresa: '', area: '', alunos: [],
    qPessoasSaida: '', qPessoasErro: '', diagPessoasTags: [], diagPessoasObs: '',
    qProcessosTreinamento: '', qProcessosAtualizacao: '', diagProcessosTags: [], diagProcessosObs: '',
    qTecnologiaBusca: '', qTecnologiaSilos: '', diagTecnologiaTags: [], diagTecnologiaObs: '',
    nivelMaturidade: '1', gapPrincipal: '', impactoNegocio: '',
    f1Patrocinador: '', f1AcaoEngajamento: '', f2Ferramenta: '', f2ResponsavelTI: '',
    f3SetorPiloto: '', f3CriterioSucesso: '', f4NovaRotina: '', f4DonoProcesso: '',
    chkOrcamento: false, chkTempo: false, chkManutencao: false
  });

  const presets = {
    pessoas: ["Resistência", "Heróis do Conhecimento", "Falta de tempo", "Cultura de punição", "Alta rotatividade"],
    processos: ["Onboarding informal", "Manuais desatualizados", "Depende de memória", "Retrabalho", "Sem lições aprendidas"],
    tecnologia: ["Silos no WhatsApp", "Sistemas difíceis", "Sem base central", "Busca ineficiente", "Muitas planilhas"]
  };

  // VERIFICA SE EXISTE UM LINK DE COMPARTILHAMENTO AO ABRIR O APP
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      carregarProjetoPeloId(id);
    }
  }, []);

  // FUNÇÃO PARA PUXAR PROJETO DO FIREBASE
  const carregarProjetoPeloId = async (idDigitado) => {
    if (!idDigitado) return;
    try {
      const docRef = doc(db, "projetos_gc", idDigitado);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFormData(docSnap.data());
        setDocId(docSnap.id);
        alert("✅ Projeto do grupo carregado com sucesso!");
      } else {
        alert("❌ Projeto não encontrado. Verifique o código.");
      }
    } catch (e) {
      console.error("Erro ao carregar projeto: ", e);
      alert("Erro de conexão com o banco de dados.");
    }
  };

  // FUNÇÃO PARA COPIAR O LINK PARA O WHATSAPP
  const copiarLinkDoGrupo = () => {
    const url = `${window.location.origin}?id=${docId}`;
    navigator.clipboard.writeText(url);
    alert(`🔗 Link copiado!\n\nEnvie no grupo do WhatsApp. Quem clicar já entra neste projeto automaticamente.`);
  };

  // FUNÇÃO PARA SALVAR NO FIREBASE
  const salvarNoFirebase = async (proximoPasso) => {
    setIsSaving(true);
    try {
      if (!docId) {
        const docRef = await addDoc(collection(db, "projetos_gc"), { ...formData, createdAt: serverTimestamp(), status: 'em_andamento' });
        setDocId(docRef.id);
        // Atualiza a URL silenciosamente para evitar perder o ID se recarregar a página
        window.history.replaceState(null, '', `?id=${docRef.id}`);
      } else {
        const docRef = doc(db, "projetos_gc", docId);
        await updateDoc(docRef, { ...formData, updatedAt: serverTimestamp() });
      }
      if (proximoPasso) setStep(proximoPasso);
    } catch (e) {
      console.error("Erro ao salvar: ", e);
      alert("Erro de conexão com o banco de dados.");
    }
    setIsSaving(false);
  };

  // PAINEL DO PROFESSOR (LISTAGEM DE PROJETOS)
  const carregarProjetosProfessor = async () => {
    const senha = prompt("Digite a senha do professor:");
    if (senha === "uniara2024") {
      const q = query(collection(db, "projetos_gc"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjetosRemotos(docs);
      setShowAdmin(true);
    } else {
      alert("Senha incorreta!");
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleTagToggle = (pilar, tag) => {
    const field = `diag${pilar.charAt(0).toUpperCase() + pilar.slice(1)}Tags`;
    const currentTags = formData[field];
    setFormData({ ...formData, [field]: currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag] });
  };

  const addAluno = () => { if (tempAluno && formData.alunos.length < 6) { setFormData({ ...formData, alunos: [...formData.alunos, tempAluno] }); setTempAluno(""); } };
  const removeAluno = (index) => { setFormData({ ...formData, alunos: formData.alunos.filter((_, i) => i !== index) }); };

  const inputStyle = "w-full p-3 border-4 border-black bg-white focus:bg-yellow-100 outline-none shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all font-bold text-black text-sm";
  const btnBrutal = "px-6 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-2";

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-pink-500 p-10">
        <div className="max-w-6xl mx-auto bg-white border-8 border-black p-8 shadow-[15px_15px_0px_black]">
          <div className="flex justify-between items-center mb-10 border-b-8 border-black pb-4">
             <h1 className="text-5xl font-black uppercase">Painel do Professor</h1>
             <button onClick={() => setShowAdmin(false)} className={`${btnBrutal} bg-red-400`}>Sair</button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {projetosRemotos.map(p => (
              <div key={p.id} className="border-4 border-black p-6 bg-yellow-50 shadow-[6px_6px_0px_black] flex justify-between items-center">
                <div>
                  {/* EXIBIÇÃO DO NOME DO GRUPO NO PAINEL */}
                  <p className="text-2xl font-black uppercase">
                    {p.nomeGrupo ? `${p.nomeGrupo} - ${p.empresa}` : p.empresa || "Sem Nome"}
                  </p>
                  <p className="font-bold text-gray-600 italic">Área: {p.area} | Membros: {p.alunos?.join(", ")}</p>
                  <p className="text-xs mt-2 bg-black text-white px-2 inline-block">ID: {p.id}</p>
                </div>
                <button onClick={() => { setFormData(p); setDocId(p.id); setShowAdmin(false); setStep(5); }} className={`${btnBrutal} bg-cyan-400`}>
                  <Eye size={20} /> Abrir Diagnóstico
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-500 p-4 md:p-10 font-sans selection:bg-yellow-400 selection:text-black">
      <div className="max-w-5xl mx-auto bg-white border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)]">
        
        {/* HEADER */}
        <div className="bg-yellow-400 p-6 border-b-4 border-black flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <img src={uniaraLogo} alt="Uniara" className="h-16 w-auto border-4 border-black bg-white" />
             <div className="h-16 w-1 bg-black hidden md:block"></div>
             <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-black">GC-LAB 4.0</h1>
                <p className="text-black font-bold text-xs bg-white inline-block px-2 border-2 border-black">MÉTODO DE IMPLANTAÇÃO</p>
             </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            {docId && (
              <button onClick={copiarLinkDoGrupo} className="bg-white text-black p-2 border-2 border-black text-xs uppercase font-black flex items-center gap-2 shadow-[2px_2px_0px_black] active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-cyan-200 transition-all">
                <Link size={16} /> Copiar Link da Equipe
              </button>
            )}
            <button onClick={carregarProjetosProfessor} className="bg-black text-white p-2 border-2 border-white text-[10px] uppercase font-bold flex items-center gap-1">
              <Users size={14} /> Professor
            </button>
            <div className="font-black text-xl text-black bg-white px-4 py-2 border-4 border-black shadow-[4px_4px_0px_black]">ETAPA {step}/5</div>
          </div>
        </div>

        <div className="p-6 md:p-10 bg-gray-50">
          {isSaving && <div className="fixed top-5 right-5 bg-black text-lime-400 p-4 border-4 border-lime-400 font-black z-50 animate-pulse">SALVANDO NA NUVEM...</div>}

          {step === 1 && (
            <div className="space-y-6">
              
              {!docId && (
                <div className="border-4 border-black p-4 bg-orange-100 shadow-[4px_4px_0px_black] flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-black uppercase text-lg">Já tem um projeto?</h3>
                    <p className="text-xs font-bold">Cole o código da sua equipe para continuar de onde pararam.</p>
                  </div>
                  <div className="flex w-full md:w-auto">
                    <input type="text" id="inputCodigo" placeholder="Cole o código..." className="p-2 border-4 border-black outline-none font-bold text-sm w-full" />
                    <button onClick={() => carregarProjetoPeloId(document.getElementById('inputCodigo').value)} className="bg-black text-white px-4 font-black uppercase text-sm border-y-4 border-r-4 border-black">Entrar</button>
                  </div>
                </div>
              )}

              <div className="p-4 border-4 border-black bg-cyan-200 flex gap-3 shadow-[4px_4px_0px_black]">
                <Info size={32} />
                <p className="font-bold text-sm">PROFESSOR: Foquem em um problema real onde a falta de conhecimento gera prejuízo.</p>
              </div>
              
              {/* LAYOUT ATUALIZADO (3 COLUNAS) COM O NOME DO GRUPO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="font-black uppercase block mb-1 text-[11px]">Grupo / Consultoria</label>
                  <input type="text" name="nomeGrupo" value={formData.nomeGrupo} onChange={handleChange} className={inputStyle} placeholder="Ex: Alpha" />
                </div>
                <div>
                  <label className="font-black uppercase block mb-1 text-[11px]">Empresa Analisada</label>
                  <input type="text" name="empresa" value={formData.empresa} onChange={handleChange} className={inputStyle} placeholder="Ex: Uniara" />
                </div>
                <div>
                  <label className="font-black uppercase block mb-1 text-[11px]">Área Foco</label>
                  <input type="text" name="area" value={formData.area} onChange={handleChange} className={inputStyle} placeholder="Ex: TI" />
                </div>

                <div className="md:col-span-3 border-4 border-black p-4 bg-white mt-4">
                  <label className="font-black uppercase block mb-2 text-lg italic">Equipe ({formData.alunos.length}/6)</label>
                  <div className="flex gap-2 mb-4">
                    <input type="text" value={tempAluno} onChange={(e) => setTempAluno(e.target.value)} className={inputStyle} placeholder="Nome do aluno..." />
                    <button onClick={addAluno} className="bg-lime-400 px-6 border-4 border-black font-black">+</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.alunos.map((aluno, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-100 border-2 border-black p-2 font-bold uppercase text-xs">
                        {aluno} <button onClick={() => removeAluno(i)} className="text-red-600"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-6">
                <div className="p-4 border-4 border-black bg-cyan-200 flex gap-3 shadow-[4px_4px_0px_black]"><Lightbulb size={32} /><p className="font-bold text-sm">AUDITORIA: Avalie os riscos de Pessoas, Processos e Tecnologia.</p></div>
                {['pessoas', 'processos', 'tecnologia'].map(pilar => (
                  <div key={pilar} className="p-4 border-4 border-black bg-white shadow-[4px_4px_0px_black]">
                    <h3 className="font-black uppercase mb-4 text-xl underline italic">{pilar}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {presets[pilar].map(tag => (
                        <button key={tag} onClick={() => handleTagToggle(pilar, tag)} className={`p-2 border-2 border-black text-[10px] font-black ${formData[`diag${pilar.charAt(0).toUpperCase() + pilar.slice(1)}Tags`].includes(tag) ? 'bg-black text-white' : 'bg-white'}`}>{tag}</button>
                      ))}
                    </div>
                    <textarea name={`diag${pilar.charAt(0).toUpperCase() + pilar.slice(1)}Obs`} value={formData[`diag${pilar.charAt(0).toUpperCase() + pilar.slice(1)}Obs`]} onChange={handleChange} className={inputStyle} rows="2" placeholder="Observações de campo..."></textarea>
                  </div>
                ))}
             </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 border-4 border-black bg-cyan-200 flex gap-3 shadow-[4px_4px_0px_black]"><ClipboardCheck size={32} /><p className="font-bold text-sm italic uppercase">Resuma o diagnóstico em uma frase de impacto.</p></div>
              <div className="border-4 border-black p-6 bg-red-100">
                <label className="font-black uppercase block mb-2">Problema Central (A Dor do Negócio)</label>
                <textarea name="gapPrincipal" value={formData.gapPrincipal} onChange={handleChange} className={inputStyle} rows="4"></textarea>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <div className="p-4 border-4 border-black bg-cyan-200 flex gap-3 shadow-[4px_4px_0px_black]"><Rocket size={32} /><p className="font-bold text-sm uppercase">DESENHE O PLANO: Divida a implantação em 4 fases críticas.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-100 p-4 border-4 border-black shadow-[4px_4px_0px_black]">
                   <h4 className="font-black mb-2 uppercase underline">Fase 1: Sensibilização</h4>
                   <input type="text" name="f1AcaoEngajamento" value={formData.f1AcaoEngajamento} onChange={handleChange} className={inputStyle} placeholder="Ação de engajamento..." />
                </div>
                <div className="bg-orange-100 p-4 border-4 border-black shadow-[4px_4px_0px_black]">
                   <h4 className="font-black mb-2 uppercase underline">Fase 2: Arquitetura SI</h4>
                   <input type="text" name="f2Ferramenta" value={formData.f2Ferramenta} onChange={handleChange} className={inputStyle} placeholder="Ferramenta escolhida..." />
                </div>
                <div className="bg-pink-100 p-4 border-4 border-black shadow-[4px_4px_0px_black]">
                   <h4 className="font-black mb-2 uppercase underline">Fase 3: Piloto</h4>
                   <input type="text" name="f3SetorPiloto" value={formData.f3SetorPiloto} onChange={handleChange} className={inputStyle} placeholder="Setor de teste..." />
                </div>
                <div className="bg-lime-100 p-4 border-4 border-black shadow-[4px_4px_0px_black]">
                   <h4 className="font-black mb-2 uppercase underline">Fase 4: Governança</h4>
                   <input type="text" name="f4NovaRotina" value={formData.f4NovaRotina} onChange={handleChange} className={inputStyle} placeholder="Dono do processo..." />
                </div>
              </div>
              <div className="p-6 bg-red-400 border-4 border-black mt-8 flex flex-col gap-3 font-bold">
                 <h3 className="text-xl font-black uppercase italic">Validadores de Viabilidade</h3>
                 <label className="flex items-center gap-3"><input type="checkbox" name="chkOrcamento" checked={formData.chkOrcamento} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> Há recurso para a ferramenta?</label>
                 <label className="flex items-center gap-3"><input type="checkbox" name="chkTempo" checked={formData.chkTempo} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> Há tempo na rotina?</label>
                 <label className="flex items-center gap-3"><input type="checkbox" name="chkManutencao" checked={formData.chkManutencao} onChange={handleChange} className="w-6 h-6 border-4 border-black" /> Isso resolve a dor?</label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div id="printArea" className="bg-white p-10 border-8 border-black font-mono">
               <div className="flex justify-between items-center mb-8 border-b-8 border-black pb-6">
                  <img src={gbxLogo} className="h-10 grayscale invert border-2 border-black" />
                  <h1 className="text-3xl font-black uppercase text-center bg-black text-white p-4 grow mx-10">Roadmap Executivo GC</h1>
                  <img src={uniaraLogo} className="h-10 border-2 border-black" />
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
                     <div className="border-4 border-black p-4 bg-purple-50"><p className="font-black uppercase italic mb-1">Fase 1: Sensibilização</p><p className="text-xs">{formData.f1AcaoEngajamento}</p></div>
                     <div className="border-4 border-black p-4 bg-orange-50"><p className="font-black uppercase italic mb-1">Fase 2: Arquitetura</p><p className="text-xs">{formData.f2Ferramenta}</p></div>
                     <div className="border-4 border-black p-4 bg-pink-50"><p className="font-black uppercase italic mb-1">Fase 3: Piloto</p><p className="text-xs">{formData.f3SetorPiloto}</p></div>
                     <div className="border-4 border-black p-4 bg-lime-50"><p className="font-black uppercase italic mb-1">Fase 4: Governança</p><p className="text-xs">{formData.f4NovaRotina}</p></div>
                  </div>
                  <div className="border-4 border-black p-4 bg-black text-white text-center text-xs font-bold italic uppercase tracking-widest leading-loose">
                    Validação Concluída via Framework GBX Learning Tools para Uniara - Sistemas de Informação
                  </div>
               </div>
            </div>
          )}

          <div className="mt-12 flex justify-between gap-4 no-print">
            {step > 1 && step < 5 ? (
              <button onClick={() => setStep(step - 1)} className={`${btnBrutal} bg-white`}>Voltar</button>
            ) : <div></div>}
            
            {step < 4 ? (
              <button onClick={() => salvarNoFirebase(step + 1)} className={`${btnBrutal} bg-cyan-400`}>Avançar &gt;</button>
            ) : step === 4 ? (
              <button 
                onClick={() => salvarNoFirebase(5)} 
                disabled={!(formData.chkOrcamento && formData.chkTempo && formData.chkManutencao)}
                className={`${btnBrutal} bg-lime-400 disabled:opacity-50`}
              >
                Gerar Projeto Executivo
              </button>
            ) : (
              <div className="flex gap-4">
                <button onClick={() => window.print()} className={`${btnBrutal} bg-black text-white`}>Imprimir PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}