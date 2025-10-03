// Fix: Define and export the Supplier interface.
export interface Supplier {
  id: string;
  name: string;
  partNumber: string;
  cost: number;
  leadTime: string;
  packaging: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  note: string;
}

// Fix: Define and export the ElectronicComponent interface.
export interface ElectronicComponent {
  id: string;
  sekoCode: string;
  aselCode: string;
  lfWmsCode: string;
  description: string;
  suppliers: Supplier[];
  logs?: LogEntry[];
}

// Fix: Add missing User interface export to resolve module not found error.
export interface User {
  id: string;
  username: string;
  password: string;
}
