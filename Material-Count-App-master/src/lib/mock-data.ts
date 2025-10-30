import type { Client, Material } from './types';

export const mockClients: Omit<Client, 'id'>[] = [
  {
    name: 'Innovate Inc.',
    address: '123 Tech Park, Silicon Valley, CA',
    plantCapacity: '100 kW',
    consumerNo: 'CIV-12345'
  },
  {
    name: 'Apex Construction',
    address: '456 Builder Ave, Metropolis, NY',
    plantCapacity: '50 kW',
    consumerNo: 'APX-67890'
  },
  {
    name: 'Synergy Corp.',
    address: '789 Trade St, Commerce City, TX',
    plantCapacity: '250 kW',
    consumerNo: 'SYN-54321'
  },
  {
    name: 'Pioneer Builders',
    address: '101 Frontier Rd, Greenfield, IN',
    plantCapacity: '10 kW',
    consumerNo: 'PIO-98765'
  },
];

export const mockMaterials: Omit<Material, 'id'>[] = [
    {
        name: "Steel Beams",
        description: "20ft, I-beam profile",
        quantity: 50,
        category: 'Fabrication',
    },
    {
        name: "Concrete Mix",
        description: "High-strength, 50lb bags",
        quantity: 200,
        category: 'Other',
    },
    {
        name: "Plywood Sheets",
        description: "4x8ft, 3/4 inch thickness",
        quantity: 150,
        category: 'Fabrication',
    },
    {
        name: "Solar Panels",
        description: "450W Monocrystalline",
        quantity: 300,
        category: 'Wiring',
    },
    {
        name: "Inverter",
        description: "5kW String Inverter",
        quantity: 30,
        category: 'Wiring',
    },
    {
        name: "Copper Wiring",
        description: "10-gauge, 500ft spool",
        quantity: 30,
        category: 'Wiring',
    },
    {
        name: "PVC Pipes",
        description: "4-inch diameter, 10ft length",
        quantity: 80,
        category: 'Wiring',
    }
];
