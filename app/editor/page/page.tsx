import PageTypeBuilder from '@/components/shared/builder/PageTypeBuilder';
import { cmsPageUI } from '@/lib/page-types/cms-page.ui';
import { emptyCmsPageState } from '@/lib/cms-page-types';

export const dynamic = 'force-dynamic';

export default function CreateCmsPage() {
  return (
    <PageTypeBuilder
      uiDef={cmsPageUI}
      initialState={emptyCmsPageState()}
      mode="create"
      apiPath="/api/page"
      editPath="/editor/page/:recordId"
    />
  );
}
