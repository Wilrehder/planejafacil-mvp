import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { parsePromobXML } from '../lib/promobParser';

describe('Promob XML Parser', () => {
  it('deve extrair valores corretos do arquivo XML oficial Promob', () => {
    const xmlPath = '/Users/macos/Downloads/37305390860-ICOZ.xml';
    if (!fs.existsSync(xmlPath)) {
      console.warn('Arquivo Promob de teste não encontrado no caminho:', xmlPath);
      return;
    }

    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const result = parsePromobXML(xmlContent);

    expect(result.budgetValue).toBe(54744.29);
    expect(result.factoryOrderCost).toBe(17107.58);
    expect(result.tablePrice).toBe(41422.72);
    expect(result.clientName).toBe('Guilherme Dias');
    expect(result.clientPhone).toBe('11994923317');
    expect(result.environmentName).toBe('Cozinha');
  });
});

