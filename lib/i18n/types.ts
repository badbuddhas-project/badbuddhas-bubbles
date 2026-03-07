export interface Translations {
  common: {
    back: string
    save: string
    cancel: string
    loading: string
    error: string
    close: string
    confirm: string
    delete: string
    yes: string
    no: string
    next: string
    done: string
    notAvailable: string
  }

  onboarding: {
    slide1Title: string
    slide1Subtitle: string
    slide2Title: string
    slide2Subtitle: string
    slide3Title: string
    slide3Subtitle: string
    getStarted: string
    skip: string
  }

  catalog: {
    hi: string
    letsBreath: string
    allPractices: string
    allLanguages: string
    premium: string
    free: string
    relax: string
    balance: string
    energize: string
    min: string
    noPractices: string
    noFavorites: string
    russian: string
    english: string
  }

  player: {
    loading: string
    notFound: string
    goBack: string
  }

  profile: {
    premiumAccount: string
    freeAccount: string
    youAreFantastic: string
    streak: string
    practices: string
    minutes: string
    lastPractice: string
    never: string
    settings: string
    language: string
    faq: string
    communityChat: string
    contactUs: string
    logout: string
    closeApp: string
    connectedEmail: string
    emailNotVerified: string
    pending: string
    sendingEmail: string
    emailSent: string
    errorTryAgain: string
    resendConfirmation: string
    disconnecting: string
    disconnectEmail: string
    disconnectConfirm: string
    syncProgress: string
    syncDescription: string
    connectEmail: string
  }

  settings: {
    title: string
    saving: string
    firstName: string
    firstNamePlaceholder: string
    lastName: string
    lastNamePlaceholder: string
    email: string
    resetPassword: string
    deleteAccount: string
    deleteAccountTitle: string
    deleteAccountMessage: string
    resetPasswordUnavailable: string
  }

  connectEmailModal: {
    title: string
    step1Description: string
    emailPlaceholder: string
    checking: string
    continue: string
    step2aDescription: string
    passwordPlaceholder: string
    passwordMinChars: string
    confirmPasswordPlaceholder: string
    connecting: string
    connect: string
    step2bDescription: string
    linking: string
    linkAccounts: string
    forgotPassword: string
    wrongPassword: string
    resetLinkSent: string
    successNewTitle: string
    successNewSentTo: string
    successNewDescription: string
    successMergeTitle: string
    successMergeDescription: string
    connectionFailed: string
    failedCheckEmail: string
    failedConnectEmail: string
    failedLinkAccounts: string
    enterPassword: string
    failedResetLink: string
  }

  auth: {
    signIn: string
    signingIn: string
    signUp: string
    creatingAccount: string
    email: string
    password: string
    confirmPassword: string
    forgotPassword: string
    resetPassword: string
    sendResetLink: string
    sending: string
    backToSignIn: string
    dontHaveAccount: string
    alreadyHaveAccount: string
    checkInboxConfirm: string
    wrongEmailOrPassword: string
    networkError: string
    checkEmailConfirmAccount: string
    passwordsDoNotMatch: string
    passwordTooShort: string
    resetYourPassword: string
    enterEmailResetLink: string
    rememberPassword: string
    checkYourEmail: string
    resetEmailSent: string
    somethingWentWrong: string
    networkErrorRetry: string
    newPassword: string
    setNewPassword: string
    updating: string
    updatePassword: string
    passwordUpdated: string
    redirecting: string
  }

  authConfirm: {
    linkExpired: string
    linkExpiredMessage: string
    requestNewLink: string
    emailConfirmed: string
    signedInAs: string
    emailLinked: string
    backToTelegram: string
    continueBtn: string
    continueInBrowser: string
  }

  faq: {
    title: string
    q1: string
    a1: string
    q2: string
    a2: string
    q3: string
    a3: string
    q4: string
    a4: string
    q5: string
    a5: string
    q6: string
    a6: string
    q7: string
    a7: string
    stillHaveQuestions: string
    contactUs: string
  }

  errors: {
    generic: string
    networkError: string
    authError: string
    invalidEmail: string
    passwordTooShort: string
    passwordsDoNotMatch: string
    failedLoadAudio: string
    failedPlayAudio: string
    failedLoadPractices: string
  }
}

/** Dot-path keys for the Translations object */
type Join<K, P> = K extends string
  ? P extends string
    ? `${K}.${P}`
    : never
  : never

type Paths<T> = T extends object
  ? { [K in keyof T]: T[K] extends string ? `${K & string}` : Join<K & string, Paths<T[K]>> }[keyof T]
  : never

export type TranslationKey = Paths<Translations>
