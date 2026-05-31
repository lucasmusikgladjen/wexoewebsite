'use client';

import PageTypeBuilder from '@/components/shared/builder/PageTypeBuilder';
import { productPageUI } from '@/lib/page-types/product-page.ui';
import { ProductPageState } from '@/lib/product-page-types';

interface ProductPageBuilderProps {
  initialState: ProductPageState;
  mode: 'create' | 'edit';
  recordId?: string;
}

export default function ProductPageBuilder({ initialState, mode, recordId }: ProductPageBuilderProps) {
  return (
    <PageTypeBuilder
      uiDef={productPageUI}
      initialState={initialState}
      mode={mode}
      recordId={recordId}
      apiPath="/api/product-page"
      editPath="/editor/product-page/:recordId"
    />
  );
}
