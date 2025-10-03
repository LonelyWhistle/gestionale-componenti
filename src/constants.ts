import { ElectronicComponent } from './types';

export const initialComponents: ElectronicComponent[] = [
  {
    id: '1',
    sekoCode: '514846',
    aselCode: 'C-RES-10K-0603',
    lfWmsCode: 'AS514846',
    description: 'Resistore 10k Ohm, 1%, 0.1W, SMD 0603',
    suppliers: [
      { id: 's1-1', name: 'Mouser', partNumber: 'MOU-514846-10K', cost: 0.05, leadTime: '5 giorni', packaging: 'Nastro' },
      { id: 's1-2', name: 'Digi-Key', partNumber: 'DK-RES-10K-R', cost: 0.06, leadTime: '3 giorni', packaging: 'Nastro' },
    ],
    logs: [],
  },
  {
    id: '2',
    sekoCode: '823301',
    aselCode: 'C-CAP-100NF-0805',
    lfWmsCode: 'AS823301',
    description: 'Condensatore Ceramico 100nF, 50V, X7R, SMD 0805',
    suppliers: [
      { id: 's2-1', name: 'Farnell', partNumber: 'FAR-CC0805-100N', cost: 0.1, leadTime: '7 giorni', packaging: 'Bobina' },
    ],
    logs: [],
  },
  {
    id: '3',
    sekoCode: '450012',
    aselCode: 'C-MCU-STM32F4',
    lfWmsCode: 'AS450012',
    description: 'Microcontrollore STM32F407VGT6, ARM Cortex-M4',
    suppliers: [
      { id: 's3-1', name: 'Mouser', partNumber: 'MOU-STM32F407', cost: 12.5, leadTime: '21 giorni', packaging: 'Vassoio' },
      { id: 's3-2', name: 'Arrow', partNumber: 'ARW-STM-F407', cost: 12.8, leadTime: '18 giorni', packaging: 'Vassoio' },
    ],
    logs: [],
  },
];
