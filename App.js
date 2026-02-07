import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from './lib/supabase';

// Importação das suas telas
import HomeScreen from './screen/Home';
import AgendamentoFeriasScreen from './screen/AgendamentoFeriasScreen';
import EdicaoFeriasScreen from './screen/EdicaoFeriasScreen';
import Funcionarios from './screen/Funcionarios';
import VisaoMensalScreen from './screen/VisaoMensalScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('HOME');
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [scheduleToEdit, setScheduleToEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carregamento inicial de dados
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Busca funcionários (todos para a tela de gestão, mas usaremos filtro na Home)
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .order('nome');
      
      // Busca agendamentos
      const { data: sch, error: schErr } = await supabase
        .from('schedules')
        .select('*');

      if (empErr) throw empErr;
      if (schErr) throw schErr;

      setEmployees(emp || []);
      setSchedules(sch || []);
    } catch (e) {
      Alert.alert("Erro de Conexão", "Não foi possível carregar os dados do banco.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÕES DE PERSISTÊNCIA (PARA FUNCIONÁRIOS) ---

  const handleSaveEmployee = async (novoFunc) => {
    try {
      const { error } = await supabase.from('employees').insert([novoFunc]);
      if (error) throw error;
      Alert.alert("Sucesso", "Funcionário cadastrado!");
      fetchData();
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar funcionário.");
    }
  };

  const handleUpdateEmployee = async (updatedFunc) => {
    try {
      const { id, ...payload } = updatedFunc;
      const { error } = await supabase.from('employees').update(payload).eq('id', id);
      if (error) throw error;
      Alert.alert("Sucesso", "Funcionário atualizado!");
      fetchData();
    } catch (e) {
      Alert.alert("Erro", "Falha ao atualizar.");
    }
  };

  // --- FUNÇÕES DE PERSISTÊNCIA (PARA AGENDAMENTOS) ---

  const handleSaveSchedule = async (newRecord) => {
    try {
      const { error } = await supabase.from('schedules').insert([newRecord]);
      if (error) throw error;
      
      Alert.alert("Sucesso", "Férias agendadas com sucesso!");
      await fetchData(); // Recarrega dados para atualizar a Home
      setCurrentScreen('HOME'); // Volta para a Home após salvar
    } catch (e) {
      Alert.alert("Erro", "Não foi possível gravar o agendamento.");
      console.error(e);
    }
  };

  const handleUpdateSchedule = async (updatedData) => {
    try {
      const { id, ...payload } = updatedData;
      const { error } = await supabase.from('schedules').update(payload).eq('id', id);
      if (error) throw error;
      
      Alert.alert("Sucesso", "Agendamento atualizado!");
      await fetchData();
      setCurrentScreen('HOME');
    } catch (e) {
      Alert.alert("Erro", "Falha na atualização.");
    }
  };

  const handleDeleteSchedules = async (ids) => {
    try {
      const { error } = await supabase.from('schedules').delete().in('id', ids);
      if (error) throw error;
      fetchData();
    } catch (e) {
      Alert.alert("Erro", "Falha ao excluir.");
    }
  };

  // --- NAVEGAÇÃO ---
  const openScheduleScreen = (data = null) => {
    setScheduleToEdit(data);
    setCurrentScreen(data ? 'EDITAR' : 'AGENDAR');
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color="#4a61dd" /></View>
    );
  }

  return (
    <View style={styles.container}>
      {currentScreen === 'HOME' && (
        <HomeScreen 
          employees={employees}
          schedules={schedules}
          onOpenRegister={() => setCurrentScreen('FUNCIONARIOS')}
          onOpenMonthly={() => setCurrentScreen('MENSAL')}
          onOpenSchedule={openScheduleScreen}
          onDeleteSchedules={handleDeleteSchedules}
        />
      )}

      {currentScreen === 'AGENDAR' && (
        <AgendamentoFeriasScreen 
          employees={employees}
          schedules={schedules}
          onSchedule={handleSaveSchedule} // Função que resolve o erro do botão salvar
          onCancel={() => setCurrentScreen('HOME')}
        />
      )}

      {currentScreen === 'EDITAR' && (
        <EdicaoFeriasScreen 
          scheduleToEdit={scheduleToEdit}
          employees={employees}
          schedules={schedules}
          onUpdate={handleUpdateSchedule}
          onCancel={() => setCurrentScreen('HOME')}
        />
      )}

      {currentScreen === 'FUNCIONARIOS' && (
        <Funcionarios 
          employees={employees}
          schedules={schedules}
          onSave={handleSaveEmployee}
          onUpdate={handleUpdateEmployee}
          onBack={() => setCurrentScreen('HOME')} 
        />
      )}
      
      {currentScreen === 'MENSAL' && (
        <VisaoMensalScreen 
          employees={employees}
          schedules={schedules}
          onBack={() => setCurrentScreen('HOME')} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});