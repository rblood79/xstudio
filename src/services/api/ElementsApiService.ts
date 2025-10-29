import { BaseApiService } from "./BaseApiService";
import { Element } from "../../types/store";

export class ElementsApiService extends BaseApiService {
  async fetchElements(pageId: string): Promise<Element[]> {
    this.validateInput(
      pageId,
      (id) => typeof id === "string" && id.length > 0,
      "fetchElements"
    );

    const elements = await this.handleApiCall("fetchElements", async () => {
      return await this.supabase
        .from("elements")
        .select("*")
        .eq("page_id", pageId)
        .order("order_num", { ascending: true });
    });

    // Supabase snake_case를 camelCase로 변환
    return elements.map(
      (el: any) => ({
        ...el,
        customId: el.custom_id, // snake_case → camelCase
        dataBinding: el.data_binding, // snake_case → camelCase
      })
    ) as Element[];
  }

  async createElement(element: Partial<Element>): Promise<Element> {
    this.validateInput(
      element,
      (el) => el && typeof el === "object",
      "createElement"
    );

    // camelCase → snake_case 변환
    const elementToSave: any = {
      ...element,
      custom_id: (element as any).customId,
      data_binding: (element as any).dataBinding,
    };

    // camelCase 필드 제거 (snake_case로 변환되었으므로)
    delete elementToSave.customId;
    delete elementToSave.dataBinding;

    const result = await this.handleApiCall("createElement", async () => {
      return await this.supabase
        .from("elements")
        .insert([elementToSave])
        .select("*")
        .single();
    });

    // 응답을 camelCase로 변환
    return {
      ...result,
      customId: result.custom_id,
      dataBinding: result.data_binding,
    } as Element;
  }

  async createMultipleElements(elements: Partial<Element>[]): Promise<Element[]> {
    this.validateInput(
      elements,
      (els) => Array.isArray(els) && els.length > 0,
      "createMultipleElements"
    );

    // 각 element에 대해 camelCase → snake_case 변환
    const elementsToSave = elements.map((element) => {
      const converted: any = {
        ...element,
        custom_id: (element as any).customId,
        data_binding: (element as any).dataBinding,
      };
      delete converted.customId;
      delete converted.dataBinding;
      return converted;
    });

    const result = await this.handleApiCall("createMultipleElements", async () => {
      return await this.supabase
        .from("elements")
        .insert(elementsToSave)
        .select("*");
    });

    // 응답을 camelCase로 변환
    if (Array.isArray(result)) {
      return result.map((el: any) => ({
        ...el,
        customId: el.custom_id,
        dataBinding: el.data_binding,
      })) as Element[];
    }
    return [];
  }

  async updateElement(
    elementId: string,
    updates: Partial<Element>
  ): Promise<Element> {
    this.validateInput(
      elementId,
      (id) => typeof id === "string" && id.length > 0,
      "updateElement"
    );
    this.validateInput(
      updates,
      (u) => u && typeof u === "object",
      "updateElement"
    );

    // camelCase → snake_case 변환
    const updatesToSave: any = { ...updates };
    if ((updates as any).customId !== undefined) {
      updatesToSave.custom_id = (updates as any).customId;
      delete updatesToSave.customId;
    }
    if ((updates as any).dataBinding !== undefined) {
      updatesToSave.data_binding = (updates as any).dataBinding;
      delete updatesToSave.dataBinding;
    }

    const result = await this.handleApiCall("updateElement", async () => {
      return await this.supabase
        .from("elements")
        .update(updatesToSave)
        .eq("id", elementId)
        .select("*")
        .single();
    });

    // 응답을 camelCase로 변환
    return {
      ...result,
      customId: result.custom_id,
      dataBinding: result.data_binding,
    } as Element;
  }

  async updateElementProps(
    elementId: string,
    props: Record<string, unknown>
  ): Promise<Element> {
    this.validateInput(
      elementId,
      (id) => typeof id === "string" && id.length > 0,
      "updateElementProps"
    );
    this.validateInput(
      props,
      (p) => p && typeof p === "object",
      "updateElementProps"
    );

    return this.handleApiCall("updateElementProps", async () => {
      return await this.supabase
        .from("elements")
        .update({ props })
        .eq("id", elementId)
        .select("*")
        .single();
    });
  }

  async deleteElement(elementId: string): Promise<void> {
    this.validateInput(
      elementId,
      (id) => typeof id === "string" && id.length > 0,
      "deleteElement"
    );

    await this.handleDeleteCall("deleteElement", async () => {
      return await this.supabase.from("elements").delete().eq("id", elementId);
    });
  }

  async deleteMultipleElements(elementIds: string[]): Promise<void> {
    this.validateInput(
      elementIds,
      (ids) => Array.isArray(ids) && ids.length > 0,
      "deleteMultipleElements"
    );

    await this.handleDeleteCall("deleteMultipleElements", async () => {
      return await this.supabase.from("elements").delete().in("id", elementIds);
    });
  }

  // 별칭으로 getElementsByPageId 추가 (코드 중복 방지)
  getElementsByPageId = this.fetchElements;
}

// 싱글톤 인스턴스
export const elementsApi = new ElementsApiService();
