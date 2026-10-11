import { z } from 'zod';

// Sanitizador de caracteres não numéricos
const sanitizeDigits = (val: string) => val.replace(/\D/g, '');

// 1. Schema do Formulário de Contato do Consumidor
export const ClientContactSchema = z.object({
  name: z.string().trim().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  phone: z.string().trim().refine(
    (val) => {
      const digits = sanitizeDigits(val);
      return digits.length >= 10 && digits.length <= 11;
    },
    { message: 'Telefone inválido. Informe DDD + número (10 ou 11 dígitos)' }
  ),
  cep: z.string().trim().refine(
    (val) => sanitizeDigits(val).length === 8,
    { message: 'CEP inválido. O CEP deve conter exatamente 8 dígitos numéricos' }
  ),
  email: z.string().trim().email('E-mail em formato inválido').optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Informe o município').optional(),
  state: z.string().trim().length(2, 'UF deve ter 2 caracteres').optional(),
});

export type ClientContactInput = z.infer<typeof ClientContactSchema>;

// 2. Schema de Ambiente do Simulador
export const SimulationEnvironmentSchema = z.object({
  typeId: z.string().min(1, 'Selecione o tipo de cômodo'),
  name: z.string().trim().min(2, 'Nome do cômodo é obrigatório'),
  areaM2: z.number().min(3, 'Área mínima é 3m²').max(150, 'Área máxima é 150m²'),
  ceilingHeight: z.number().min(2.2, 'Pé-direito mínimo é 2.2m').max(4.5, 'Pé-direito máximo é 4.5m'),
  wallCount: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

export type SimulationEnvironmentInput = z.infer<typeof SimulationEnvironmentSchema>;

// 3. Schema Completo de Submissão de Simulação
export const SimulationSubmissionSchema = z.object({
  clientInfo: ClientContactSchema,
  environments: z.array(SimulationEnvironmentSchema).min(1, 'Adicione pelo menos um cômodo ao orçamento'),
});

export type SimulationSubmissionInput = z.infer<typeof SimulationSubmissionSchema>;

// 4. Schema de Cadastro de Lead Externo (Lojista Pro)
export const ExternalLeadSchema = z.object({
  name: z.string().trim().min(3, 'Nome do cliente é obrigatório'),
  phone: z.string().trim().refine(
    (val) => sanitizeDigits(val).length >= 10,
    { message: 'Telefone/WhatsApp deve ter no mínimo 10 dígitos' }
  ),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Informe a cidade'),
  state: z.string().trim().length(2, 'UF inválida'),
  environment: z.string().trim().min(2, 'Descreva os ambientes desejados'),
  source: z.enum(['instagram', 'google', 'indicacao', 'balcao']),
  estimatedMin: z.number().min(100, 'Valor mínimo inválido'),
  estimatedMax: z.number().min(100, 'Valor máximo inválido'),
});

export type ExternalLeadInput = z.infer<typeof ExternalLeadSchema>;

// 5. Schema de Credenciamento de Nova Loja (Admin)
export const StoreRegistrationSchema = z.object({
  name: z.string().trim().min(3, 'Nome fantasia da loja é obrigatório'),
  cnpj: z.string().trim().optional().or(z.literal('')),
  responsibleName: z.string().trim().min(3, 'Nome do responsável é obrigatório'),
  city: z.string().trim().min(2, 'Cidade é obrigatória'),
  state: z.string().trim().length(2, 'UF deve ter 2 caracteres'),
  plan: z.enum(['Basic', 'Pro']),
  regionServed: z.string().trim().min(3, 'Descreva as regiões atendidas'),
  phone: z.string().trim().min(8, 'Telefone obrigatório'),
  whatsapp: z.string().trim().min(8, 'WhatsApp comercial obrigatório'),
  email: z.string().trim().email('E-mail corporativo inválido'),
  status: z.enum(['Ativa', 'Pendente', 'Inativa']),
});

export type StoreRegistrationInput = z.infer<typeof StoreRegistrationSchema>;
