import { describe, it, expect } from 'vitest';
import { Lead } from '../types';

describe('Validação e Persistência dos Dados Cadastrais do Cliente', () => {
  it('deve marcar o cadastro como incompleto quando faltar algum dos 5 campos cadastrais obrigatórios', () => {
    const leadIncompleto: Partial<Lead> = {
      id: 'lead-1',
      name: 'Wilson Rehder Valle',
      phone: '11989883025',
      cpf: '123.456.789-00',
      birthDate: '1985-05-15',
      billingAddress: 'Rua das Flores, 123 - Centro, Suzano - SP',
      // installationAddress e desiredDeadline ausentes
    };

    const isComplete = Boolean(
      leadIncompleto.cpf?.trim() &&
      leadIncompleto.birthDate?.trim() &&
      leadIncompleto.billingAddress?.trim() &&
      leadIncompleto.installationAddress?.trim() &&
      leadIncompleto.desiredDeadline?.trim()
    );

    expect(isComplete).toBe(false);
  });

  it('deve marcar o cadastro como completo quando todos os 5 campos cadastrais estiverem preenchidos', () => {
    const leadCompleto: Partial<Lead> = {
      id: 'lead-2',
      name: 'Wilson Rehder Valle',
      phone: '11989883025',
      cpf: '123.456.789-00',
      birthDate: '1985-05-15',
      billingAddress: 'Rua das Flores, 123 - Centro, Suzano - SP',
      installationAddress: 'Av. Paulista, 1000, Apto 42 - SP',
      desiredDeadline: '45 dias úteis',
    };

    const isComplete = Boolean(
      leadCompleto.cpf?.trim() &&
      leadCompleto.birthDate?.trim() &&
      leadCompleto.billingAddress?.trim() &&
      leadCompleto.installationAddress?.trim() &&
      leadCompleto.desiredDeadline?.trim()
    );

    expect(isComplete).toBe(true);
  });
});
