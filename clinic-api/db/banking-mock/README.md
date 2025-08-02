# Banking Mock Data

This directory contains mock banking data that mimics Pluggy's exact API responses.

## Structure

```
banking-mock/
├── therapist-1/
│   ├── items.json         # Mimics GET /items
│   ├── accounts.json      # Mimics GET /accounts  
│   └── transactions.json  # Mimics GET /transactions
├── therapist-2/
│   ├── items.json
│   ├── accounts.json
│   └── transactions.json
└── README.md
```

## Data Format

All JSON files match Pluggy's exact API response format:

- **items.json**: Array of PluggyItemResponse objects
- **accounts.json**: Array of PluggyAccount objects  
- **transactions.json**: Array of PluggyTransaction objects

## Usage

Set `PLUGGY_MOCK_MODE=true` and optionally `MOCK_THERAPIST_ID=1` to use this data.

The system loads data based on therapist ID:
- Therapist 1 → `therapist-1/` directory
- Therapist 2 → `therapist-2/` directory

## Realistic Therapy Payment Scenarios

The mock transactions include realistic patterns:
- R$600 PIX (4 sessions @ R$150 each)
- R$300 PIX (2 sessions, partial payment)  
- R$800 PIX (4 sessions + R$200 tip/advance)
- R$1200 PIX (8 sessions advance payment)
- R$580 PIX (4 sessions - R$20 short)
- Unknown PIX payments (new patients)
- Bank fees and transfers