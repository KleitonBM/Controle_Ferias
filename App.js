import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from './lib/supabase';

// Importação das suas telas
import HomeScreen from './screen/Home';
import AgendamentoFeriasScreen from './screen/AgendamentoFeriasScreen';
import EdicaoFeriasScreen from './screen/EdicaoFeriasScreen';
import Funcionarios from './screen/Funcionarios';
import VisaoMensalScreen from './screen/VisaoMensalScreen';

// --- 1. CONFIGURAÇÕES TÉCNICAS (ÂNCORAS 4X4) ---

const ANCHORS = {
    'A': new Date(2025, 11, 27),
    'B': new Date(2025, 11, 29),
    'C': new Date(2025, 11, 31),
    'D': new Date(2026, 0, 2)
};

// --- 2. UTILITÁRIOS DE DATA E ESCALA ---

const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    try {
        const cleanStr = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
        const [year, month, day] = cleanStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return isNaN(date.getTime()) ? null : date;
    } catch (e) { return null; }
};

const extrairLetraFuncionario = (funcionario) => {
    if (!funcionario) return 'A';
    const letraDireta = funcionario.letra?.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(letraDireta)) return letraDireta;
    const match = funcionario.nome?.match(/Letra\s([A-D])/i);
    return match ? match[1].toUpperCase() : 'A';
};

// Descobre se um dia é Trabalho ou Folga para uma letra específica
const getDayType = (date, letra) => {
    const anchor = ANCHORS[letra] || ANCHORS['A'];
    const diffTime = date.getTime() - anchor.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cycleDay = ((diffDays % 8) + 8) % 8;
    return cycleDay < 4 ? 'TRABALHO' : 'FOLGA';
};

// --- 3. LÓGICA DINÂMICA DO FERISTA ---

const gerarEscalaFerista = (agendamentos, listaFuncionarios) => {
    if (!agendamentos || agendamentos.length === 0) return {};

    const mapaFerista = {};
    const ordenados = [...agendamentos].sort((a, b) => {
        const da = parseDateSafe(a.data_inicio || a.startDate);
        const db = parseDateSafe(b.data_inicio || b.startDate);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
    });

    ordenados.forEach((feriasAlvo, index) => {
        const dataInicioNova = parseDateSafe(feriasAlvo.data_inicio || feriasAlvo.startDate);
        if (!dataInicioNova) return;

        const funcAlvo = listaFuncionarios.find(f => f.id === (feriasAlvo.employee_id || feriasAlvo.employeeId));
        const letraDestino = extrairLetraFuncionario(funcAlvo);
        
        const feriasAnterior = index > 0 ? ordenados[index - 1] : null;
        const dataFimAnterior = feriasAnterior ? parseDateSafe(feriasAnterior.data_fim || feriasAnterior.endDate) : null;
        const funcAnterior = feriasAnterior ? listaFuncionarios.find(f => f.id === (feriasAnterior.employee_id || feriasAnterior.employeeId)) : null;
        const letraOrigem = funcAnterior ? extrairLetraFuncionario(funcAnterior) : null;

        // --- LÓGICA DE TRANSIÇÃO INTELIGENTE ---
        // Vamos analisar os 8 dias anteriores ao início da cobertura atual
        let dataCorrente = new Date(dataInicioNova);
        
        for (let i = 1; i <= 8; i++) {
            dataCorrente.setDate(dataCorrente.getDate() - 1);
            
            // Se encostarmos no fim das férias anteriores, paramos a transição
            if (dataFimAnterior && dataCorrente <= dataFimAnterior) break;

            const dataKey = dataCorrente.toISOString().split('T')[0];

            // 1. Se a Letra Destino trabalha hoje, o ferista DEVE FOLGAR (preparação)
            // 2. Se a Letra Destino folga hoje, o ferista PODE TRABALHAR na Letra Origem
            const tipoDestino = getDayType(dataCorrente, letraDestino);

            if (tipoDestino === 'TRABALHO') {
                mapaFerista[dataKey] = { tipo: 'FOLGA', descricao: 'Descanso Pré-Escala' };
            } else {
                // Se temos uma letra de origem (estávamos cobrindo alguém), checamos se ela trabalha
                if (letraOrigem) {
                    const tipoOrigem = getDayType(dataCorrente, letraOrigem);
                    if (tipoOrigem === 'TRABALHO') {
                        mapaFerista[dataKey] = { tipo: 'TRABALHO', descricao: `Ponte Letra ${letraOrigem}` };
                    } else {
                        mapaFerista[dataKey] = { tipo: 'FOLGA', descricao: 'Folga Dupla' };
                    }
                } else {
                    mapaFerista[dataKey] = { tipo: 'FOLGA', descricao: 'Sem Cobertura' };
                }
            }
        }
    });

    return mapaFerista;
};

// --- 4. COMPONENTE APP ---

export default function App() {
    const [currentScreen, setCurrentScreen] = useState('HOME');
    const [employees, setEmployees] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [scheduleToEdit, setScheduleToEdit] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: emp } = await supabase.from('employees').select('*').order('nome');
            const { data: sch } = await supabase.from('schedules').select('*');
            setEmployees(emp || []);
            setSchedules(sch || []);
        } catch (e) {
            Alert.alert("Erro", "Erro ao carregar dados.");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const feristaData = useMemo(() => {
        return gerarEscalaFerista(schedules, employees);
    }, [schedules, employees]);

    const handleSaveSchedule = async (record) => {
        const { error } = await supabase.from('schedules').insert([record]);
        if (!error) { await fetchData(); setCurrentScreen('HOME'); }
    };

    const handleUpdateSchedule = async (data) => {
        const { id, ...payload } = data;
        const { error } = await supabase.from('schedules').update(payload).eq('id', id);
        if (!error) { await fetchData(); setCurrentScreen('HOME'); }
    };

    const handleDeleteSchedules = async (ids) => {
        await supabase.from('schedules').delete().in('id', ids);
        fetchData();
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4a61dd" /></View>;

    return (
        <View style={styles.container}>
            {currentScreen === 'HOME' && (
                <HomeScreen 
                    employees={employees} 
                    schedules={schedules} 
                    feristaData={feristaData}
                    onOpenRegister={() => setCurrentScreen('FUNCIONARIOS')}
                    onOpenMonthly={() => setCurrentScreen('MENSAL')}
                    onOpenSchedule={(d) => { setScheduleToEdit(d); setCurrentScreen(d ? 'EDITAR' : 'AGENDAR'); }}
                    onDeleteSchedules={handleDeleteSchedules}
                />
            )}
            {currentScreen === 'AGENDAR' && <AgendamentoFeriasScreen employees={employees} onSchedule={handleSaveSchedule} onCancel={() => setCurrentScreen('HOME')} />}
            {currentScreen === 'EDITAR' && <EdicaoFeriasScreen scheduleToEdit={scheduleToEdit} employees={employees} onUpdate={handleUpdateSchedule} onCancel={() => setCurrentScreen('HOME')} />}
            {currentScreen === 'FUNCIONARIOS' && <Funcionarios employees={employees} onBack={() => setCurrentScreen('HOME')} onSave={fetchData} onUpdate={fetchData} />}
            {currentScreen === 'MENSAL' && <VisaoMensalScreen employees={employees} schedules={schedules} feristaData={feristaData} onBack={() => setCurrentScreen('HOME')} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});