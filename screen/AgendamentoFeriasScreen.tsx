import React, { useState, useEffect } from 'react';
import {
    SafeAreaView, View, Text, TextInput, TouchableOpacity,
    FlatList, StyleSheet, ScrollView, Modal, Alert, Switch
} from 'react-native';

const COLORS = {
    BG: '#ffffff', HEADER: '#f8f8f8', LINE: '#eeeeee',
    TEXT: '#333', MUTED: '#666', PRIMARY: '#4a61dd',
    SAVE: '#4CAF50', CANCEL: '#666', INPUT_BG: '#f9f9f9',
    SUCCESS: '#1b5e20', INFO: '#e3f2fd', BONUS: '#673AB7',
    ERROR: '#d32f2f', WARNING: '#ff9800'
};

// MAPEAMENTO DINÂMICO DE ÂNCORAS (Salto de 2 em 2 dias)
const ANCHORS = {
    'A': new Date(2025, 11, 27),
    'B': new Date(2025, 11, 29),
    'C': new Date(2025, 11, 31),
    'D': new Date(2026, 0, 2)
};

export default function AgendamentoFeriasScreen({ employees, schedules, onSchedule, onCancel }) {
    const [showEmpPicker, setShowEmpPicker] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [startDate, setStartDate] = useState(''); 
    const [duration, setDuration] = useState('20'); // Valor padrão comum
    const [venderDezDias, setVenderDezDias] = useState(false); 
    
    const [calcData, setCalcData] = useState({ 
        saidaReal: '', inicioOficial: '', termino: '', retorno: '', 
        proximaDisponivel: '', erroFolga: false, erroGeral: '' 
    });

    const handleDateChange = (text) => {
        let v = text.replace(/\D/g, '');
        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
        if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5, 9);
        setStartDate(v);
    };

    const toDateObj = (str) => {
        if (!str || str.length < 10) return new Date(NaN);
        const [day, month, year] = str.split('/').map(Number);
        return new Date(year, month - 1, day);
    };

    const formatDate = (date) => {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    };

    // FUNÇÃO QUE CONSIDERA A LETRA DO FUNCIONÁRIO
    const getDayStatus = (date, empLetra = 'A') => {
        const anchor = ANCHORS[empLetra] || ANCHORS['A'];
        const d = new Date(date);
        d.setHours(0,0,0,0);
        const diffTime = d.getTime() - anchor.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const cycleDay = ((diffDays % 8) + 8) % 8;
        return cycleDay < 4 ? 'TRABALHO' : 'FOLGA';
    };

    const validarRegrasRigorosas = (emp, dataInicio, diasGozados, diasVenda) => {
        if (!emp || isNaN(dataInicio.getTime())) return { ok: false, msg: '' };

        const partes = emp.admissao.includes('-') ? emp.admissao.split('-') : emp.admissao.split('/');
        const adm = emp.admissao.includes('-') 
            ? new Date(partes[0], partes[1] - 1, partes[2])
            : new Date(partes[2], partes[1] - 1, partes[0]);

        let ciclo = dataInicio.getFullYear() - adm.getFullYear();
        if (dataInicio.getMonth() < adm.getMonth() || (dataInicio.getMonth() === adm.getMonth() && dataInicio.getDate() < adm.getDate())) {
            ciclo--;
        }

        if (ciclo < 1) return { ok: false, msg: "Ainda não completou o 1º período aquisitivo." };

        const duplicado = (schedules || []).some(s => {
            if (s.employeeId !== emp.id) return false;
            const dS = toDateObj(s.startDate);
            let cicloS = dS.getFullYear() - adm.getFullYear();
            if (dS.getMonth() < adm.getMonth() || (dS.getMonth() === adm.getMonth() && dS.getDate() < adm.getDate())) {
                cicloS--;
            }
            return cicloS === ciclo;
        });

        //if (duplicado) return { ok: false, msg: `O colaborador já possui férias agendadas para o ciclo de ${dataInicio.getFullYear()}.` }; //

        if ((diasGozados + diasVenda) > 30) return { ok: false, msg: "Soma de gozo e venda excede 30 dias." };

        return { ok: true, msg: '' };
    };

    useEffect(() => {
        if (selectedEmp && startDate.length === 10 && duration) {
            const userDate = toDateObj(startDate);
            const check = validarRegrasRigorosas(selectedEmp, userDate, parseInt(duration) || 0, venderDezDias ? 10 : 0);
            
            // Passa a Letra do funcionário para o cálculo de status
            const isFolga = getDayStatus(userDate, selectedEmp.letra) === 'FOLGA';
            let proxima = '';
            if (isFolga) {
                let busca = new Date(userDate);
                while (getDayStatus(busca, selectedEmp.letra) === 'FOLGA') busca.setDate(busca.getDate() + 1);
                proxima = formatDate(busca);
            }

            let sObj = new Date(userDate);
            sObj.setDate(sObj.getDate() - 1);
            while (getDayStatus(sObj, selectedEmp.letra) === 'FOLGA') sObj.setDate(sObj.getDate() - 1);
            sObj.setDate(sObj.getDate() + 1);

            const tObj = new Date(userDate);
            tObj.setDate(tObj.getDate() + (parseInt(duration) || 0) - 1);

            let rObj = new Date(tObj);
            rObj.setDate(rObj.getDate() + 1);
            while (getDayStatus(rObj, selectedEmp.letra) !== 'TRABALHO') rObj.setDate(rObj.getDate() + 1);

            setCalcData({
                saidaReal: formatDate(sObj),
                inicioOficial: formatDate(userDate),
                termino: formatDate(tObj),
                retorno: formatDate(rObj),
                proximaDisponivel: proxima,
                erroFolga: isFolga,
                erroGeral: check.msg
            });
        }
    }, [startDate, duration, venderDezDias, selectedEmp, schedules]);

    const handleSave = () => {
        console.log("passou aqui")
        const userDate = toDateObj(startDate);
        const resultado = validarRegrasRigorosas(selectedEmp, userDate, parseInt(duration) || 0, venderDezDias ? 10 : 0);

        if (!resultado.ok) {
            Alert.alert("Agendamento Negado", resultado.msg);
            return;
        }

        if (calcData.erroFolga) {
            Alert.alert("Erro", "Não é permitido iniciar férias em dias de folga.");
            return;
        }

        onSchedule({
            employeeId: selectedEmp.id,
            employeeName: selectedEmp.nome,
            startDate: calcData.inicioOficial,
            endDate: calcData.termino,
            durationDays: parseInt(duration),
            abonoPecuniario: venderDezDias,
            diasVendidos: venderDezDias ? 10 : 0,
            //letra: selectedEmp.letra // Adiciona a letra ao registro para facilitar a Timeline
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Modal visible={showEmpPicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Selecionar Colaborador Ativo</Text>
                        <TextInput style={styles.modalSearchInput} placeholder="Pesquisar..." onChangeText={setSearchText} />
                        <FlatList 
                            // FILTRO: APENAS COLABORADORES ATIVOS
                            data={employees.filter(e => e.status === true && e.nome.toLowerCase().includes(searchText.toLowerCase()))}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedEmp(item); setShowEmpPicker(false); }}>
                                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                        <Text style={styles.modalText}>{item.nome}</Text>
                                        <Text style={{fontWeight: 'bold', color: COLORS.PRIMARY}}>Grupo {item.letra}</Text>
                                    </View>
                                    <Text style={styles.modalSubText}>Admissão: {item.admissao}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowEmpPicker(false)}><Text style={{fontWeight: 'bold'}}>CANCELAR</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={styles.header}><Text style={styles.headerTitle}>Agendar Férias</Text></View>

            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={styles.comboButton} onPress={() => setShowEmpPicker(true)}>
                    <Text style={selectedEmp ? {fontWeight: 'bold'} : {color: COLORS.MUTED}}>
                        {selectedEmp ? `${selectedEmp.nome} (Grupo ${selectedEmp.letra})` : "Selecione o funcionário ativo..."}
                    </Text>
                </TouchableOpacity>

                <View style={styles.vendaRow}>
                    <View style={{flex: 1}}>
                        <Text style={styles.vendaTitle}>Venda de Férias (Abono)</Text>
                        <Text style={styles.vendaSub}>Vender 10 dias do saldo anual</Text>
                    </View>
                    <Switch value={venderDezDias} onValueChange={setVenderDezDias} trackColor={{ false: "#ddd", true: COLORS.PRIMARY }} />
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Início das Férias</Text>
                        <TextInput 
                            style={[styles.input, (calcData.erroFolga || calcData.erroGeral) && {borderColor: COLORS.ERROR, borderWidth: 2}]} 
                            placeholder="DD/MM/AAAA" keyboardType="numeric" maxLength={10} value={startDate}
                            onChangeText={handleDateChange}
                        />
                    </View>
                    <View style={{ width: 15 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Dias de Gozo</Text>
                        <TextInput style={styles.input} placeholder="Qtd" keyboardType="numeric" value={duration} onChangeText={setDuration} />
                    </View>
                </View>

                {calcData.erroGeral ? (
                    <View style={styles.errorCard}><Text style={styles.errorText}>⚠️ {calcData.erroGeral}</Text></View> //
                ) : null}

                {calcData.erroFolga && (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorText}>❌ Início em dia de FOLGA (Escala {selectedEmp?.letra}) não permitido.</Text>
                        <TouchableOpacity onPress={() => setStartDate(calcData.proximaDisponivel)}>
                            <Text style={styles.suggestionText}>Sugestão: {calcData.proximaDisponivel} (Aplicar)</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* PROJEÇÃO VISUAL */}
                {calcData.termino && !calcData.erroFolga && !calcData.erroGeral && (
                    <View style={{ marginTop: 20 }}>
                        <View style={[styles.card, {backgroundColor: '#e3f2fd'}]}>
                            <Text style={styles.cardLab}>SAÍDA ANTECIPADA (FOLGA)</Text>
                            <Text style={[styles.cardVal, {color: COLORS.PRIMARY}]}>{calcData.saidaReal}</Text>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.card, {flex: 1}]}>
                                <Text style={styles.cardLab}>INÍCIO OFICIAL</Text>
                                <Text style={styles.cardVal}>{calcData.inicioOficial}</Text>
                            </View>
                            <View style={{width: 10}}/>
                            <View style={[styles.card, {flex: 1}]}>
                                <Text style={styles.cardLab}>ÚLTIMO DIA</Text>
                                <Text style={styles.cardVal}>{calcData.termino}</Text>
                            </View>
                        </View>
                        <View style={[styles.card, {backgroundColor: '#e8f5e9'}]}>
                            <Text style={styles.cardLab}>RETORNO AO TRABALHO (1ª ESCALA)</Text>
                            <Text style={[styles.cardVal, {color: COLORS.SUCCESS}]}>{calcData.retorno}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.CANCEL }]} onPress={onCancel}><Text style={styles.btnT}>CANCELAR</Text></TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: COLORS.SAVE, opacity: (calcData.termino && !calcData.erroFolga && !calcData.erroGeral) ? 1 : 0.5 }]} 
                        onPress={handleSave} 
                        disabled={!calcData.termino || calcData.erroFolga || !!calcData.erroGeral}
                    >
                        <Text style={styles.btnT}>SALVAR</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BG },
    header: { padding: 20, backgroundColor: COLORS.HEADER, borderBottomWidth: 1, borderColor: COLORS.LINE, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    form: { padding: 20 },
    label: { fontSize: 13, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
    comboButton: { backgroundColor: COLORS.INPUT_BG, padding: 18, borderRadius: 12, borderWidth: 1, borderColor: COLORS.LINE },
    vendaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f4ff', padding: 15, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: '#d0d9ff' },
    vendaTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.PRIMARY },
    vendaSub: { fontSize: 11, color: COLORS.MUTED },
    input: { backgroundColor: COLORS.INPUT_BG, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: COLORS.LINE, fontSize: 16 },
    row: { flexDirection: 'row', marginTop: 10 },
    errorCard: { backgroundColor: '#ffebee', padding: 15, borderRadius: 10, marginTop: 15, borderWidth: 1, borderColor: '#ef9a9a' },
    errorText: { color: COLORS.ERROR, fontWeight: 'bold', textAlign: 'center', fontSize: 12 },
    suggestionText: { color: COLORS.PRIMARY, textAlign: 'center', marginTop: 5, fontWeight: 'bold', textDecorationLine: 'underline' },
    card: { padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.LINE, alignItems: 'center', marginVertical: 5, backgroundColor: '#fff' },
    cardLab: { fontSize: 9, fontWeight: 'bold', color: '#666' },
    cardVal: { fontSize: 18, fontWeight: 'bold' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 50 },
    btn: { flex: 1, padding: 18, borderRadius: 12, alignItems: 'center' },
    btnT: { color: '#fff', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', width: '90%', borderRadius: 20, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalSearchInput: { backgroundColor: COLORS.INPUT_BG, padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: COLORS.LINE },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.LINE },
    modalText: { fontSize: 16 },
    modalSubText: { fontSize: 12, color: COLORS.MUTED },
    closeBtn: { marginTop: 20, padding: 10, alignItems: 'center' }
});