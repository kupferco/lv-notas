// src/components/Sessions.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Session, Patient } from '../types';

type SessionStatus = 'agendada' | 'compareceu' | 'cancelada';
type SessionFilter = 'all' | 'agendada' | 'compareceu' | 'cancelada';

export const Sessions = () => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<SessionFilter>('all');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedPatient, setSelectedPatient] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);

    // Form state for creating/editing sessions
    const [formData, setFormData] = useState({
        patientId: '',
        date: '',
        time: '',
        status: 'agendada' as SessionStatus
    });

    useEffect(() => {
        if (user?.email) {
            loadSessions();
            loadPatients();
        }
    }, [user]);

    const loadSessions = async () => {
        try {
            setIsLoading(true);
            const data = await apiService.getSessions(user?.email || '');
            setSessions(data);
        } catch (error) {
            console.error('Error loading sessions:', error);
            alert('Erro: Falha ao carregar sessões');
        } finally {
            setIsLoading(false);
        }
    };

    const loadPatients = async () => {
        try {
            const data = await apiService.getPatients();
            setPatients(data);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const handleCreateSession = async () => {
        if (!formData.patientId || !formData.date || !formData.time) {
            alert('Erro: Preencha todos os campos obrigatórios');
            return;
        }

        try {
            const localDateTime = `${formData.date}T${formData.time}:00`;

            console.log('=== TIMEZONE DEBUG ===');
            console.log('Frontend date input:', formData.date);
            console.log('Frontend time input:', formData.time);
            console.log('Local sessionDateTime:', localDateTime);
            console.log('As Date object:', new Date(localDateTime));

            const response = await apiService.createSession({
                patientId: formData.patientId,
                date: localDateTime, // Send local time, not UTC
                status: formData.status,
                therapistEmail: user?.email || ''
            });

            // Check if there's a message in the response (partial success)
            if (response.message) {
                alert(`Sessão criada com aviso: ${response.message}`);
            } else {
                alert('Sucesso: Sessão criada com sucesso!');
            }

            setShowCreateForm(false);
            resetForm();
            loadSessions();
        } catch (error: any) {
            console.error('Error creating session: ', error);
            alert(error);
        }
    };

    const handleEditSession = async () => {
        if (!editingSession || !formData.patientId || !formData.date || !formData.time) {
            alert('Erro: Preencha todos os campos obrigatórios');
            return;
        }

        try {
            const localDateTime = `${formData.date}T${formData.time}:00`;
            await apiService.updateSession(editingSession.id, {
                patientId: formData.patientId,
                date: localDateTime,
                status: formData.status
            });

            alert('Sucesso: Sessão atualizada com sucesso!');
            setEditingSession(null);
            resetForm();
            loadSessions();
        } catch (error) {
            console.error('Error updating session:', error);
            alert('Erro: Falha ao atualizar sessão');
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (confirm('Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.')) {
            try {
                await apiService.deleteSession(sessionId);
                alert('Sessão excluída com sucesso!');
                loadSessions(); // Refresh the list
            } catch (error: any) {
                console.error('Error deleting session:', error);
                alert(error.message || 'Erro ao excluir sessão');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            patientId: '',
            date: '',
            time: '',
            status: 'agendada'
        });
    };

    const startEdit = (session: Session) => {
        setEditingSession(session);
        const sessionDate = new Date(session.date);
        setFormData({
            patientId: session.patient_id,
            date: sessionDate.toISOString().split('T')[0],
            time: sessionDate.toTimeString().split(' ')[0].substring(0, 5),
            status: session.status
        });
        setShowCreateForm(true);
    };

    const getPatientName = (patientId: string) => {
        const patient = patients.find(p => p.id.toString() === patientId);
        return patient?.name || 'Paciente não encontrado';
    };

    const getStatusColor = (status: SessionStatus) => {
        switch (status) {
            case 'agendada': return '#2196F3';
            case 'compareceu': return '#4CAF50';
            case 'cancelada': return '#F44336';
            default: return '#757575';
        }
    };

    const getStatusText = (status: SessionStatus) => {
        switch (status) {
            case 'agendada': return 'Agendada';
            case 'compareceu': return 'Compareceu';
            case 'cancelada': return 'Cancelada';
            default: return status;
        }
    };

    const filteredSessions = sessions.filter(session => {
        const matchesStatus = filter === 'all' || session.status === filter;
        const matchesDate = !dateFilter || session.date.includes(dateFilter);
        const matchesPatient = !selectedPatient || session.patient_id === selectedPatient;

        return matchesStatus && matchesDate && matchesPatient;
    });

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <Text>Carregando sessões...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Sessões</Text>
                <Pressable
                    style={styles.addButton}
                    onPress={() => {
                        setShowCreateForm(true);
                        setEditingSession(null);
                        resetForm();
                    }}
                >
                    <Text style={styles.addButtonText}>+ Nova Sessão</Text>
                </Pressable>
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <View style={styles.filterRow}>
                    <View style={styles.filterItem}>
                        <Text style={styles.filterLabel}>Status:</Text>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as SessionFilter)}
                            style={styles.nativeSelect as any}
                        >
                            <option value="all">Todas</option>
                            <option value="agendada">Agendadas</option>
                            <option value="compareceu">Compareceu</option>
                            <option value="cancelada">Canceladas</option>
                        </select>
                    </View>

                    <View style={styles.filterItem}>
                        <Text style={styles.filterLabel}>Paciente:</Text>
                        <select
                            value={selectedPatient}
                            onChange={(e) => setSelectedPatient(e.target.value)}
                            style={styles.nativeSelect as any}
                        >
                            <option value="">Todos</option>
                            {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.name}
                                </option>
                            ))}
                        </select>
                    </View>
                </View>

                <View style={styles.filterRow}>
                    <View style={styles.filterItem}>
                        <Text style={styles.filterLabel}>Data:</Text>
                        <TextInput
                            style={styles.dateInput}
                            placeholder="YYYY-MM-DD"
                            value={dateFilter}
                            onChangeText={setDateFilter}
                        />
                    </View>
                </View>
            </View>

            {/* Create/Edit Form */}
            {showCreateForm && (
                <View style={styles.formContainer}>
                    <Text style={styles.formTitle}>
                        {editingSession ? 'Editar Sessão' : 'Nova Sessão'}
                    </Text>

                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Paciente *</Text>
                        <select
                            value={formData.patientId}
                            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                            style={styles.nativeSelect as any}
                        >
                            <option value="">Selecione o paciente</option>
                            {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.name}
                                </option>
                            ))}
                        </select>
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Data *</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="YYYY-MM-DD"
                            value={formData.date}
                            onChangeText={(value) => setFormData({ ...formData, date: value })}
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Horário *</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="HH:MM"
                            value={formData.time}
                            onChangeText={(value) => setFormData({ ...formData, time: value })}
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Status</Text>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as SessionStatus })}
                            style={styles.nativeSelect as any}
                        >
                            <option value="agendada">Agendada</option>
                            <option value="compareceu">Compareceu</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </View>

                    <View style={styles.formActions}>
                        <Pressable
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => {
                                setShowCreateForm(false);
                                setEditingSession(null);
                                resetForm();
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.button, styles.saveButton]}
                            onPress={editingSession ? handleEditSession : handleCreateSession}
                        >
                            <Text style={styles.saveButtonText}>
                                {editingSession ? 'Atualizar' : 'Criar'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Sessions List */}
            <View style={styles.sessionsContainer}>
                <Text style={styles.sessionsCount}>
                    {filteredSessions.length} sessão(ões) encontrada(s)
                </Text>

                {filteredSessions.map(session => (
                    <View key={session.id} style={styles.sessionCard}>
                        <View style={styles.sessionHeader}>
                            <Text style={styles.sessionPatient}>
                                {getPatientName(session.patient_id)}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) }]}>
                                <Text style={styles.statusText}>
                                    {getStatusText(session.status)}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.sessionDate}>
                            {new Date(session.date).toLocaleString('pt-BR')}
                        </Text>

                        {session.google_calendar_event_id && (
                            <Text style={styles.calendarId}>
                                📅 ID: {session.google_calendar_event_id}
                            </Text>
                        )}

                        <View style={styles.sessionActions}>
                            <Pressable
                                style={[styles.actionButton, styles.editButton]}
                                onPress={() => startEdit(session)}
                            >
                                <Text style={styles.editButtonText}>Editar</Text>
                            </Pressable>

                            {session.status !== 'cancelada' && (
                                <Pressable
                                    style={[styles.actionButton, styles.cancelSessionButton]}
                                    onPress={() => handleDeleteSession(session.id)}
                                >
                                    <Text style={styles.cancelSessionButtonText}>Cancelar</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                ))}

                {filteredSessions.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            Nenhuma sessão encontrada com os filtros aplicados
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        backgroundColor: '#6200ee',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 5,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    filtersContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    filterRow: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    filterItem: {
        flex: 1,
        marginRight: 10,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    nativeSelect: {
        width: '100%',
        height: 40,
    },
    dateInput: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    formContainer: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        elevation: 2,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    formField: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    formInput: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#6200ee',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    sessionsContainer: {
        padding: 16,
    },
    sessionsCount: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    sessionCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        elevation: 1,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sessionPatient: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    sessionDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    calendarId: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
    },
    sessionActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginLeft: 8,
    },
    editButton: {
        backgroundColor: '#2196F3',
    },
    editButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cancelSessionButton: {
        backgroundColor: '#F44336',
    },
    cancelSessionButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});