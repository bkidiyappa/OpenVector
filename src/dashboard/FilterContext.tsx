import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FilterOptions } from "../types";
import { getConfig, getFilters, getValidation, type FilterState } from "./api";
import type { ValidationMessage } from "../types";

type HierarchyRow = {
  organization: string;
  vertical: string;
  product: string;
  team?: string;
};

type FilterContextValue = {
  filter: FilterState;
  options: FilterOptions;
  messages: ValidationMessage[];
  setFilterValue: (key: keyof FilterState, value: string) => void;
  applyHierarchy: (row: HierarchyRow) => void;
};

const EMPTY_OPTIONS: FilterOptions = {
  organizations: [],
  verticals: [],
  products: [],
  teams: []
};

const FilterContext = createContext<FilterContextValue | null>(null);

const ALL: FilterState = {
  organization: "All",
  vertical: "All",
  product: "All",
  team: "All"
};

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>(ALL);
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [messages, setMessages] = useState<ValidationMessage[]>([]);

  useEffect(() => {
    void getConfig().then((config) => {
      setFilter({
        organization: config.defaults.organization || "All",
        vertical: config.defaults.vertical || "All",
        product: config.defaults.product || "All",
        team: config.defaults.team || "All"
      });
    });
    void getValidation().then((result) => setMessages(result.messages));
  }, []);

  useEffect(() => {
    void getFilters(filter).then((result) => setOptions(result.options));
  }, [filter]);

  const value = useMemo<FilterContextValue>(
    () => ({
      filter,
      options,
      messages,
      setFilterValue: (key, value) => {
        setFilter((current) => {
          const next = { ...current, [key]: value };
          if (key === "organization") {
            next.vertical = "All";
            next.product = "All";
            next.team = "All";
          }
          if (key === "vertical") {
            next.product = "All";
            next.team = "All";
          }
          if (key === "product") {
            next.team = "All";
          }
          return next;
        });
      },
      applyHierarchy: (row) => {
        setFilter({
          organization: row.organization,
          vertical: row.vertical,
          product: row.product,
          team: row.team && row.team !== "All" ? row.team : "All"
        });
      }
    }),
    [filter, options, messages]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within FilterProvider");
  }
  return context;
}
