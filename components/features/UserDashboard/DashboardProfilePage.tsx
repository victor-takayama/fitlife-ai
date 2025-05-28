
import React, { useState, useContext, useEffect, ChangeEvent } from 'react';
import { AuthContext, AuthContextType } from '../../../contexts/AuthContext';
import { User as UserType, FitnessLevel, SubscriptionTier } from '../../../types';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { User, Mail, Shield, Zap, Activity, Dumbbell, Clock, Save, Image as ImageIcon, Lock as LockIcon } from 'lucide-react';
import { DEFAULT_USER_FITNESS_LEVEL, DEFAULT_USER_GOALS, DEFAULT_USER_EQUIPMENT, DEFAULT_USER_TIME_PER_SESSION, PRICING_PLANS, ROUTES } from '../../../constants';
import { useToasts, ToastType } from '../../ui/Toast'; 
import LoadingSpinner from '../../ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import PageWrapper from '../../layout/PageWrapper'; // Added import


const commonGoalsList = ['Perder peso', 'Ganhar massa muscular', 'Melhorar condicionamento', 'Aumentar força', 'Mais flexibilidade', 'Reduzir estresse'];
const commonEquipmentList = ['Halteres', 'Barra', 'Anilhas', 'Kettlebell', 'Elásticos de resistência', 'Corda de pular', 'Esteira', 'Bicicleta Ergométrica', 'Bola de Pilates', 'Nenhum (Peso Corporal)'];


const DashboardProfilePage: React.FC = () => {
  const authContext = useContext(AuthContext);
  const { addToast } = useToasts();

  // Handle context being undefined, though ProtectedRoute should prevent this
  if (!authContext) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /><p className="ml-2">Carregando contexto...</p></div>;
  }
  const { user, login, updateUserPlan, isLoading: authIsLoading } = authContext;


  const [formData, setFormData] = useState<Partial<UserType>>({
    name: '',
    email: '', 
    avatarUrl: '',
    fitnessLevel: DEFAULT_USER_FITNESS_LEVEL,
    goals: [...DEFAULT_USER_GOALS],
    availableEquipment: [...DEFAULT_USER_EQUIPMENT],
    timePerSession: DEFAULT_USER_TIME_PER_SESSION,
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
        fitnessLevel: user.fitnessLevel || DEFAULT_USER_FITNESS_LEVEL,
        goals: user.goals && user.goals.length > 0 ? [...user.goals] : [...DEFAULT_USER_GOALS],
        availableEquipment: user.availableEquipment && user.availableEquipment.length > 0 ? [...user.availableEquipment] : [...DEFAULT_USER_EQUIPMENT],
        timePerSession: user.timePerSession || DEFAULT_USER_TIME_PER_SESSION,
        plan: user.plan || SubscriptionTier.None,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'timePerSession' ? parseInt(value) : value }));
  };

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => {
      const currentGoals = prev.goals || [];
      return {
        ...prev,
        goals: currentGoals.includes(goal) ? currentGoals.filter(g => g !== goal) : [...currentGoals, goal]
      };
    });
  };
  
  const handleEquipmentToggle = (equipment: string) => {
    setFormData(prev => {
      const currentEquipment = prev.availableEquipment || [];
      return {
        ...prev,
        availableEquipment: currentEquipment.includes(equipment) ? currentEquipment.filter(eq => eq !== equipment) : [...currentEquipment, equipment]
      };
    });
  };


  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.email) {
        addToast('Nome e email são obrigatórios.', ToastType.Error);
        return;
    }
    setIsSavingProfile(true);

    try {
      // Use the modified login function in AuthContext to update user details
      // This ensures all parts of the user object can be updated
      await login({
        email: user.email, // Email is key, usually not changed this way but required by current login fn
        name: formData.name,
        avatarUrl: formData.avatarUrl,
        fitnessLevel: formData.fitnessLevel,
        goals: formData.goals,
        availableEquipment: formData.availableEquipment,
        timePerSession: formData.timePerSession,
        // plan is managed by updateUserPlan, not here
      });
      
      addToast('Perfil atualizado com sucesso!', ToastType.Success);
    } catch (error) {
      addToast('Erro ao atualizar perfil. Tente novamente.', ToastType.Error);
      console.error("Profile update error:", error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
        addToast('Por favor, insira sua senha atual.', ToastType.Warning);
        return;
    }
    if (newPassword !== confirmNewPassword) {
      addToast('As novas senhas não coincidem!', ToastType.Error);
      return;
    }
    if (newPassword.length < 6) {
      addToast('A nova senha deve ter pelo menos 6 caracteres.', ToastType.Error);
      return;
    }
    setIsSavingPassword(true);
    // Simulate password change
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In a real app, call an API endpoint here.
    // For simulation, we just show a success message.
    addToast('Senha alterada com sucesso! (Simulação)', ToastType.Success);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setIsSavingPassword(false);
  };

  if (authIsLoading && !user) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /><p className="ml-3">Carregando perfil...</p></div>;
  }
  if (!user) {
    // This should be caught by ProtectedRoute, but as a fallback:
    return (
        <PageWrapper title="Erro de Autenticação">
            <div className="text-center">
                <p className="text-red-500">Usuário não encontrado ou não autenticado.</p>
                <Link to={ROUTES.LOGIN} className="text-primary hover:underline mt-4 inline-block">
                    Por favor, faça login novamente.
                </Link>
            </div>
        </PageWrapper>
    );
  }

  const fitnessLevelOptions = Object.values(FitnessLevel).map(level => ({ value: level, label: level }));
  const currentPlanDetails = PRICING_PLANS.find(p => p.id === user.plan);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold text-neutral-dark dark:text-white">Meu Perfil</h2>

      {/* Informações Pessoais */}
      <Card>
        <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-6 flex items-center">
          <User size={22} className="mr-2 text-primary" /> Informações Pessoais
        </h3>
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nome Completo" name="name" value={formData.name || ''} onChange={handleChange} icon={<User size={18} className="text-slate-400"/>} required />
            <Input label="Email" name="email" type="email" value={formData.email || ''} icon={<Mail size={18} className="text-slate-400"/>} disabled title="Email não pode ser alterado (simulação)" />
          </div>
          <Input label="URL da Imagem de Avatar" name="avatarUrl" value={formData.avatarUrl || ''} onChange={handleChange} icon={<ImageIcon size={18} className="text-slate-400"/>} placeholder="https://exemplo.com/avatar.png"/>
          
          <div className="text-right">
            <Button type="submit" isLoading={isSavingProfile || authIsLoading} leftIcon={Save}>
              Salvar Informações
            </Button>
          </div>
        </form>
      </Card>

      {/* Preferências de Fitness */}
      <Card>
        <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-6 flex items-center">
          <Zap size={22} className="mr-2 text-primary" /> Preferências de Fitness
        </h3>
        {/* This form can also call handleProfileSubmit as it updates parts of the same user object */}
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select label="Nível de Condicionamento" name="fitnessLevel" options={fitnessLevelOptions} value={formData.fitnessLevel || ''} onChange={handleChange} />
            <Input label="Tempo por Sessão (minutos)" name="timePerSession" type="number" value={formData.timePerSession || ''} onChange={handleChange} min="10" step="5" icon={<Clock size={18} className="text-slate-400"/>}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-dark dark:text-neutral-light mb-2">Objetivos Principais</label>
            <div className="flex flex-wrap gap-2">
              {commonGoalsList.map(goal => (
                <Button key={goal} type="button" variant={(formData.goals || []).includes(goal) ? 'primary' : 'outline'} size="sm" onClick={() => handleGoalToggle(goal)}>
                  {goal}
                </Button>
              ))}
            </div>
          </div>
           <div>
            <label className="block text-sm font-medium text-neutral-dark dark:text-neutral-light mb-2">Equipamentos Disponíveis</label>
            <div className="flex flex-wrap gap-2">
              {commonEquipmentList.map(eq => (
                <Button key={eq} type="button" variant={(formData.availableEquipment || []).includes(eq) ? 'secondary' : 'outline'} size="sm" onClick={() => handleEquipmentToggle(eq)}
                  className={(formData.availableEquipment || []).includes(eq) ? "" : "border-secondary text-secondary hover:bg-secondary/10"}>
                  {eq}
                </Button>
              ))}
            </div>
          </div>
          <div className="text-right">
            <Button type="submit" isLoading={isSavingProfile || authIsLoading} leftIcon={Save}>
              Salvar Preferências de Fitness
            </Button>
          </div>
        </form>
      </Card>
      
      {/* Gerenciamento de Senha */}
      <Card>
        <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-6 flex items-center">
          <Shield size={22} className="mr-2 text-primary" /> Alterar Senha
        </h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <Input label="Senha Atual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} icon={<LockIcon size={18} className="text-slate-400"/>} required />
          <Input label="Nova Senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={<LockIcon size={18} className="text-slate-400"/>} required />
          <Input label="Confirmar Nova Senha" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} icon={<LockIcon size={18} className="text-slate-400"/>} required />
          <div className="text-right">
            <Button type="submit" isLoading={isSavingPassword} variant="outline" leftIcon={Save}>
              Alterar Senha
            </Button>
          </div>
        </form>
      </Card>

      {/* Detalhes da Assinatura */}
      <Card>
        <h3 className="text-xl font-semibold text-neutral-dark dark:text-white mb-4 flex items-center">
          <Dumbbell size={22} className="mr-2 text-primary" /> Minha Assinatura
        </h3>
        {currentPlanDetails ? (
          <>
            <p className="text-lg">Seu plano atual: <span className="font-bold text-primary dark:text-primary-light">{currentPlanDetails.name}</span> (R${currentPlanDetails.pricePerMonth}/mês)</p>
            <p className="text-sm text-neutral-DEFAULT dark:text-slate-300 mb-4">Agradecemos por fazer parte da comunidade FitLife!</p>
            <Link to={ROUTES.PLANS}>
                <Button variant="outline">Gerenciar Assinatura</Button>
            </Link>
          </>
        ) : (
          <>
            <p className="text-lg text-neutral-DEFAULT dark:text-slate-300">Você não possui uma assinatura ativa.</p>
            <Link to={ROUTES.PLANS}>
                <Button variant="primary">Ver Planos</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
};

export default DashboardProfilePage;
