import ProductPageBuilder from '@/components/product-page/ProductPageBuilder';
import { emptyProductPageState } from '@/lib/product-page-types';

export const dynamic = 'force-dynamic';

export default function CreateProductPagePage() {
  return <ProductPageBuilder initialState={emptyProductPageState()} mode="create" />;
}
