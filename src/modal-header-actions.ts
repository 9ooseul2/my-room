export interface ModalHeaderAction {
  attribute: string
  action: string
}

export interface ModalHeaderActionsOptions {
  close: ModalHeaderAction
  back?: ModalHeaderAction
}

const iconMarkup = (kind: 'back' | 'close') => kind === 'back'
  ? '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M13 8H3M7 4L3 8L7 12" /></svg>'
  : '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4L12 12M12 4L4 12" /></svg>'

const buttonMarkup = (kind: 'back' | 'close', { attribute, action }: ModalHeaderAction) => `
  <button
    class="modal-header-action modal-header-action--${kind}"
    type="button"
    ${attribute}="${action}"
    aria-label="${kind === 'back' ? 'Back' : 'Close'}"
  >${iconMarkup(kind)}</button>`

/** Shared, icon-only actions for every modal/popup header. */
export const createModalHeaderActions = ({ close, back }: ModalHeaderActionsOptions) => `
  ${back ? buttonMarkup('back', back) : ''}
  ${buttonMarkup('close', close)}`

