import { PageState, PageAction, Tab, TabDownload } from './types';

let tabCounter = 0;
export function generateTabId(): string {
  return `tab-${++tabCounter}-${Date.now()}`;
}

let dlCounter = 0;
export function generateDownloadId(): string {
  return `dl-${++dlCounter}-${Date.now()}`;
}

export function createEmptyTab(): Tab {
  return {
    id: generateTabId(),
    name: 'Ny tab',
    type: 'textimage',
    tiH2: '',
    tiText: '',
    tiBenefits: '',
    tiImage: '',
    tiInverted: false,
    fmUrl: '',
    faqContent: '',
    calTitle1: '',
    calUrl1: '',
    calTitle2: '',
    calUrl2: '',
    calTitle3: '',
    calUrl3: '',
    downloads: [],
    compareTitle: '',
    compareColA: 'Alternativ A',
    compareColB: 'Alternativ B',
    compareRows: '',
    stepsTitle: '',
    stepsRows: '',
  };
}

export const initialState: PageState = {
  mode: 'create',
  slug: '',
  recordId: null,

  h1: '',
  heroDescription: '',
  heroImage: '',
  heroCta1Text: 'Kontakta oss',
  heroCta1Url: '/kontakt/',
  heroCta2Text: '',
  heroCta2Url: '',

  contentH2: '',
  contentText: '',
  contentBenefits: '',

  sidebarType: '',
  caseTitle: '',
  caseDescription: '',
  caseImage: '',
  caseOutcomes: '',
  caseCta: '',
  caseCtaUrl: '',
  eventType: '',
  eventTitle: '',
  eventDescription: '',
  eventDate: '',
  eventLocation: '',
  eventWebhook: '',
  magnetTitle: '',
  magnetFormat: '',
  magnetDescription: '',
  magnetFileUrl: '',
  magnetWebhook: '',
  calcTitle: '',
  calcHtml: '',

  tabs: [],

  contactName: '',
  contactTitle: '',
  contactEmail: '',
  contactPhone: '',
  contactImage: '',
  contactQuote: '',

  showContent: true,
  showSidebar: true,
  showTabs: true,
  showContact: true,

  colorMain: '#11325D',
  colorSecondary: '#F28C28',
};

export function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SET_TAB_FIELD':
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.tabId
            ? { ...tab, [action.field]: action.value }
            : tab
        ),
      };

    case 'ADD_TAB':
      return { ...state, tabs: [...state.tabs, createEmptyTab()] };

    case 'REMOVE_TAB':
      return {
        ...state,
        tabs: state.tabs.filter((t) => t.id !== action.tabId),
      };

    case 'REORDER_TABS': {
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(action.fromIndex, 1);
      tabs.splice(action.toIndex, 0, moved);
      return { ...state, tabs };
    }

    case 'ADD_DOWNLOAD':
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.tabId
            ? {
                ...tab,
                downloads: [
                  ...tab.downloads,
                  {
                    id: generateDownloadId(),
                    name: '',
                    description: '',
                    fileUrl: '',
                    fileType: 'PDF',
                  } as TabDownload,
                ],
              }
            : tab
        ),
      };

    case 'REMOVE_DOWNLOAD':
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.tabId
            ? {
                ...tab,
                downloads: tab.downloads.filter(
                  (d) => d.id !== action.downloadId
                ),
              }
            : tab
        ),
      };

    case 'SET_DOWNLOAD_FIELD':
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.tabId
            ? {
                ...tab,
                downloads: tab.downloads.map((d) =>
                  d.id === action.downloadId
                    ? { ...d, [action.field]: action.value }
                    : d
                ),
              }
            : tab
        ),
      };

    case 'LOAD_STATE':
      return action.state;

    default:
      return state;
  }
}
