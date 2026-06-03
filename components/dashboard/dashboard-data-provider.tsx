"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ContractData } from "@/lib/types/contracts";

export type OpenContractPanelOptions = {
  editValue?: boolean;
};

type OpenContractPanelFn = (
  row: ContractData,
  options?: OpenContractPanelOptions
) => void;

type DashboardDataContextValue = {
  contractData: ContractData[];
  vendorIdByContractId: Record<string, string>;
  updateContractRow: (row: ContractData) => void;
  registerOpenContractPanel: (fn: OpenContractPanelFn | null) => void;
  openContractPanel: (row: ContractData, options?: OpenContractPanelOptions) => void;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(
  null
);

export function DashboardDataProvider({
  initialContractData,
  vendorIdByContractId = {},
  children,
}: {
  initialContractData: ContractData[];
  vendorIdByContractId?: Record<string, string>;
  children: React.ReactNode;
}) {
  const [contractData, setContractData] = useState(initialContractData);

  useEffect(() => {
    setContractData(initialContractData);
  }, [initialContractData]);

  const panelOpenerRef = useRef<OpenContractPanelFn | null>(null);

  const updateContractRow = useCallback((row: ContractData) => {
    setContractData((prev) =>
      prev.map((item) => (item.id === row.id ? row : item))
    );
  }, []);

  const registerOpenContractPanel = useCallback(
    (fn: OpenContractPanelFn | null) => {
      panelOpenerRef.current = fn;
    },
    []
  );

  const openContractPanel = useCallback(
    (row: ContractData, options?: OpenContractPanelOptions) => {
      panelOpenerRef.current?.(row, options);
    },
    []
  );

  return (
    <DashboardDataContext.Provider
      value={{
        contractData,
        vendorIdByContractId,
        updateContractRow,
        registerOpenContractPanel,
        openContractPanel,
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return ctx;
}
