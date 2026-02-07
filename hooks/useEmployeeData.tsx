// hooks/useEmployeeData.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// REMOVA o "default" daqui, deixe apenas "export function"
export function useEmployeeData() {
    const [employees, setEmployees] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: empData } = await supabase.from('employees').select('*').order('nome');
            const { data: schData } = await supabase.from('schedules').select('*');
            setEmployees(empData || []);
            setSchedules(schData || []);
        } catch (error) { 
            console.error("Erro ao buscar:", error); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchData(); }, []);

    const addEmployee = async (newEmp) => {
        const { data, error } = await supabase.from('employees').insert([newEmp]).select();
        if (!error) setEmployees(prev => [...prev, data[0]]);
    };

    const addSchedule = async (newSch) => {
        const { data, error } = await supabase.from('schedules').insert([newSch]).select();
        if (!error) setSchedules(prev => [...prev, data[0]]);
    };

    const deleteSchedules = async (ids) => {
        const { error } = await supabase.from('schedules').delete().in('id', ids);
        if (!error) setSchedules(prev => prev.filter(s => !ids.includes(s.id)));
    };

    return { employees, schedules, setSchedules, loading, addEmployee, addSchedule, deleteSchedules };
}

// ADICIONE ESTA FUNÇÃO LOGO ABAIXO PARA A VISÃO MENSAL FUNCIONAR
export function generateMonthlyDistribution(employees) {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const calendar = Array.from({ length: 12 }, () => []);

    employees.forEach(emp => {
        const vencimento = getNextConcessiveEnd(emp.admissao);
        if (vencimento) {
            const m = vencimento.getMonth();
            calendar[m].push({
                ...emp,
                mustTakeBy: `${String(vencimento.getDate()).padStart(2, '0')}/${String(vencimento.getMonth() + 1).padStart(2, '0')}/${vencimento.getFullYear()}`
            });
        }
    });
    return { months, calendar };
}

export function getNextConcessiveEnd(admissionDateStr) {
    if (!admissionDateStr) return null;
    const parts = admissionDateStr.split('/');
    if (parts.length !== 3) return null;
    const admission = new Date(parts[2], parts[1] - 1, parts[0]);
    if (isNaN(admission)) return null;

    const today = new Date();
    let nextVencimento = new Date(admission);
    while (nextVencimento <= today) {
        nextVencimento.setFullYear(nextVencimento.getFullYear() + 1);
    }
    nextVencimento.setFullYear(nextVencimento.getFullYear() + 1);
    return nextVencimento;
}