import { createContext, useContext } from "react";
import type { CollectionDataServices } from "../types";

export const CollectionDataContext = createContext<CollectionDataServices>({});

/**
 * Collection Data 서비스 훅
 */
export function useCollectionDataServices(): CollectionDataServices {
  return useContext(CollectionDataContext);
}
