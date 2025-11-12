export interface FacilitatedTx {
  tx_hash: string;
  block_number: number;
  block_hash: string;
  block_timestamp: Date;
  sender: string;
  target: string;
  facilitator: string;
  token_address: string | null;
  value: string;
  gas_used: number | null;
  gas_price: string | null;
  input_data: Buffer | null;
  decoded: Record<string, any> | null;
  status: "pending" | "confirmed" | "reverted" | "reorged";
  chain_id: number;
  tx_type: number;
}

export interface FacilitatorEvent {
  id: number;
  tx_hash: string;
  event_name: string;
  event_args: Record<string, any>;
  log_index: number;
  block_number: number;
}

export interface IndexerState {
  id: number;
  chain_id: number;
  last_processed_block: number;
  last_processed_block_hash: string | null;
  updated_at: Date;
}

export interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  blockHash: string;
}

