import type { ReactNode } from "react";
import type { CollectionDataServices } from "../types";
import { CollectionDataContext } from "./collectionDataContext";

/**
 * Collection Data 서비스 Provider
 */
export function CollectionDataProvider({
  children,
  services,
}: {
  children: ReactNode;
  services: CollectionDataServices;
}) {
  return (
    <CollectionDataContext.Provider value={services}>
      {children}
    </CollectionDataContext.Provider>
  );
}
