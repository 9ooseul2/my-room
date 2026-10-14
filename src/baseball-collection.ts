export type BaseballUniformKind = 'HOME' | 'AWAY' | 'SPECIAL'
export type BaseballUniformMarking = 'NO MARKING' | 'MARKING'

export interface BaseballUniform {
  id: string
  name: string
  season: string
  kind: BaseballUniformKind
  marking: BaseballUniformMarking
  playerName?: string
  playerNumber?: string
  size: string
  image: Blob
  imageName: string
  createdAt: number
  updatedAt: number
}

type CollectionCategory = 'uniforms' | 'goods'
type EditorMode = 'add' | 'edit' | null

const collectionDatabaseName = 'baseball-room-collection'
const collectionStoreName = 'uniforms'
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const isUniformKind = (value: FormDataEntryValue | null): value is BaseballUniformKind =>
  value === 'HOME' || value === 'AWAY' || value === 'SPECIAL'

const isUniformMarking = (value: FormDataEntryValue | null): value is BaseballUniformMarking =>
  value === 'NO MARKING' || value === 'MARKING'

const valueFrom = (data: FormData, name: string) => {
  const value = data.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

const uniformTemplateLabel = (kind: BaseballUniformKind) => `${kind} uniform template`

const uniformTemplateMarkup = (kind: BaseballUniformKind, className = '') => `
  <span class="collection-uniform-template collection-uniform-template--${kind.toLowerCase()} ${className}" aria-label="${uniformTemplateLabel(kind)}">
    <i class="collection-uniform-template__neck"></i>
    <i class="collection-uniform-template__seam"></i>
    <i class="collection-uniform-template__badge"></i>
  </span>`

/**
 * An IndexedDB-only repository. It deliberately never reads or writes the
 * Spanish Room's localStorage records, and keeps one Blob per uniform.
 */
export class BaseballCollectionRepository {
  private databasePromise: Promise<IDBDatabase> | null = null

  private getDatabase() {
    if (this.databasePromise) return this.databasePromise

    this.databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(collectionDatabaseName, 1)

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(collectionStoreName)) {
          const store = database.createObjectStore(collectionStoreName, { keyPath: 'id' })
          store.createIndex('updatedAt', 'updatedAt')
        }
      }

      request.onsuccess = () => {
        const database = request.result
        database.onversionchange = () => database.close()
        resolve(database)
      }
      request.onerror = () => reject(request.error ?? new Error('컬렉션 저장소를 열 수 없습니다.'))
      request.onblocked = () => reject(new Error('다른 탭에서 컬렉션 저장소를 사용 중입니다.'))
    })

    return this.databasePromise
  }

  async list() {
    const database = await this.getDatabase()
    return new Promise<BaseballUniform[]>((resolve, reject) => {
      const transaction = database.transaction(collectionStoreName, 'readonly')
      const request = transaction.objectStore(collectionStoreName).getAll()
      request.onsuccess = () => {
        const uniforms = request.result as BaseballUniform[]
        resolve(uniforms.sort((first, second) => second.updatedAt - first.updatedAt))
      }
      request.onerror = () => reject(request.error ?? new Error('컬렉션을 불러오지 못했습니다.'))
    })
  }

  async put(uniform: BaseballUniform) {
    const database = await this.getDatabase()
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(collectionStoreName, 'readwrite')
      transaction.objectStore(collectionStoreName).put(uniform)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('유니폼을 저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('유니폼 저장이 취소되었습니다.'))
    })
  }

  async delete(id: string) {
    const database = await this.getDatabase()
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(collectionStoreName, 'readwrite')
      transaction.objectStore(collectionStoreName).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('유니폼을 삭제하지 못했습니다.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('유니폼 삭제가 취소되었습니다.'))
    })
  }
}

export class BaseballCollectionController {
  private readonly root: HTMLElement
  private readonly repository: BaseballCollectionRepository
  private uniforms: BaseballUniform[] = []
  private selectedId: string | null = null
  private category: CollectionCategory = 'uniforms'
  private editorMode: EditorMode = null
  private editingId: string | null = null
  private deletingId: string | null = null
  private notice = ''
  private photoUrl: string | null = null
  private photoUrlId: string | null = null
  private isOpen = false

  constructor(root: HTMLElement, repository = new BaseballCollectionRepository()) {
    this.root = root
    this.repository = repository
    this.root.addEventListener('click', (event) => void this.handleClick(event))
    this.root.addEventListener('submit', (event) => void this.handleSubmit(event))
    this.root.addEventListener('change', (event) => this.handleChange(event))
    this.root.addEventListener('error', (event) => this.handleImageError(event), true)
  }

  setOpen(isOpen: boolean) {
    this.isOpen = isOpen
    if (!isOpen) {
      this.releasePhotoUrl()
      return
    }

    void this.refresh()
  }

  private async refresh(preferredId?: string | null) {
    try {
      this.uniforms = await this.repository.list()
      const targetId = preferredId ?? this.selectedId
      this.selectedId = this.uniforms.some((uniform) => uniform.id === targetId)
        ? targetId
        : this.uniforms[0]?.id ?? null
      this.notice = ''
    } catch (error) {
      this.notice = error instanceof Error ? error.message : '컬렉션을 불러오지 못했습니다.'
    }

    if (this.isOpen) this.render()
  }

  private get selectedUniform() {
    return this.uniforms.find((uniform) => uniform.id === this.selectedId) ?? null
  }

  private get editingUniform() {
    return this.uniforms.find((uniform) => uniform.id === this.editingId) ?? null
  }

  private releasePhotoUrl() {
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl)
    this.photoUrl = null
    this.photoUrlId = null
  }

  private selectedPhotoUrl(uniform: BaseballUniform) {
    if (this.photoUrl && this.photoUrlId === uniform.id) return this.photoUrl

    this.releasePhotoUrl()
    this.photoUrl = URL.createObjectURL(uniform.image)
    this.photoUrlId = uniform.id
    return this.photoUrl
  }

  private render() {
    const selected = this.selectedUniform
    if (!selected || this.category === 'goods') this.releasePhotoUrl()

    this.root.innerHTML = `
      <section class="baseball-collection" aria-live="polite">
        <header class="baseball-collection__sign">
          <span class="baseball-collection__sign-kicker">MY COLLECTION</span>
          <strong>DOOSAN BEARS</strong>
        </header>

        <div class="baseball-collection__body">
          <nav class="baseball-collection__categories" aria-label="컬렉션 카테고리">
            ${this.categoryButton('uniforms', 'UNIFORMS')}
            ${this.categoryButton('goods', 'GOODS')}
            <p class="baseball-collection__nav-note">PERSONAL<br/>ARCHIVE</p>
          </nav>

          ${this.category === 'goods' ? this.goodsMarkup() : this.uniformCollectionMarkup(selected)}
        </div>

        ${this.category === 'uniforms' ? this.cardsMarkup() : ''}
        ${this.notice ? `<p class="baseball-collection__notice" role="status">${escapeHtml(this.notice)}</p>` : ''}
        ${this.editorMarkup()}
        ${this.confirmDeleteMarkup()}
      </section>`
  }

  private categoryButton(category: CollectionCategory, label: string) {
    const selected = this.category === category
    return `
      <button class="baseball-collection__category${selected ? ' is-selected' : ''}" type="button" data-collection-action="category" data-category="${category}" aria-pressed="${selected}">
        <span aria-hidden="true">${category === 'uniforms' ? '▣' : '◆'}</span>${label}
      </button>`
  }

  private uniformCollectionMarkup(selected: BaseballUniform | null) {
    const stage = selected
      ? `
          <img class="baseball-collection__photo" data-collection-photo src="${this.selectedPhotoUrl(selected)}" alt="${escapeHtml(selected.name)} 실사 이미지" />
          <span class="baseball-collection__hanger" aria-hidden="true"></span>`
      : `
          <div class="baseball-collection__empty-stage">
            <span aria-hidden="true">◇</span>
            <p>SELECT A UNIFORM<br/>OR ADD YOUR FIRST ONE</p>
          </div>`

    return `
      <div class="baseball-collection__display">
        <section class="baseball-collection__wardrobe" aria-label="선택한 유니폼 이미지">
          <span class="baseball-collection__lamp" aria-hidden="true"></span>
          <div class="baseball-collection__photo-frame">${stage}</div>
        </section>
        ${this.infoMarkup(selected)}
      </div>`
  }

  private infoMarkup(uniform: BaseballUniform | null) {
    if (!uniform) {
      return `
        <aside class="baseball-collection__info baseball-collection__info--empty">
          <h2>UNIFORM INFO</h2>
          <p>등록된 유니폼을 선택하면<br/>상세 정보가 표시됩니다.</p>
        </aside>`
    }

    const markingDetails = uniform.marking === 'MARKING'
      ? `
        <div><dt>PLAYER</dt><dd>${escapeHtml(uniform.playerName ?? '')}</dd></div>
        <div><dt>NUMBER</dt><dd>${escapeHtml(uniform.playerNumber ?? '')}</dd></div>`
      : ''

    return `
      <aside class="baseball-collection__info">
        <h2>${escapeHtml(uniform.name)}</h2>
        <dl>
          <div><dt>TYPE</dt><dd>${uniform.kind}</dd></div>
          <div><dt>SEASON</dt><dd>${escapeHtml(uniform.season)}</dd></div>
          <div><dt>MARKING</dt><dd>${uniform.marking}</dd></div>
          ${markingDetails}
          <div><dt>SIZE</dt><dd>${escapeHtml(uniform.size)}</dd></div>
        </dl>
        <div class="baseball-collection__info-actions">
          <button type="button" data-collection-action="edit" data-uniform-id="${uniform.id}">EDIT</button>
          <button type="button" data-collection-action="ask-delete" data-uniform-id="${uniform.id}">DELETE</button>
        </div>
      </aside>`
  }

  private goodsMarkup() {
    return `
      <section class="baseball-collection__goods" aria-label="굿즈 컬렉션 준비 중">
        <span aria-hidden="true">◆</span>
        <h2>GOODS</h2>
        <p>굿즈 컬렉션은 준비 중입니다.<br/>등록 기능은 아직 열지 않았습니다.</p>
      </section>`
  }

  private cardsMarkup() {
    const cards = this.uniforms.map((uniform) => `
      <button class="baseball-collection__card${uniform.id === this.selectedId ? ' is-selected' : ''}" type="button" data-collection-action="select" data-uniform-id="${uniform.id}" aria-pressed="${uniform.id === this.selectedId}">
        ${uniformTemplateMarkup(uniform.kind)}
        <span>${escapeHtml(uniform.season)}</span>
        <strong>${uniform.kind}</strong>
      </button>`).join('')

    return `
      <section class="baseball-collection__cards" aria-label="등록된 유니폼">
        <button class="baseball-collection__add-card" type="button" data-collection-action="open-add">
          <span aria-hidden="true">+</span>
          <strong>ADD<br/>UNIFORM</strong>
        </button>
        ${cards || '<p class="baseball-collection__cards-empty">등록된 유니폼이 없습니다.</p>'}
      </section>`
  }

  private editorMarkup() {
    if (!this.editorMode) return ''

    const uniform = this.editorMode === 'edit' ? this.editingUniform : null
    const isMarking = uniform?.marking === 'MARKING'
    const title = this.editorMode === 'edit' ? 'EDIT UNIFORM' : 'ADD UNIFORM'

    return `
      <div class="baseball-collection__editor-backdrop" role="presentation">
        <form class="baseball-collection__editor" data-collection-form>
          <header>
            <p>PERSONAL COLLECTION</p>
            <h2>${title}</h2>
            <button type="button" data-collection-action="close-editor" aria-label="등록 폼 닫기">×</button>
          </header>
          <div class="baseball-collection__form-grid">
            <label>UNIFORM NAME<input name="name" required value="${escapeHtml(uniform?.name ?? '')}" placeholder="2024 HOME UNIFORM" /></label>
            <label>SEASON<input name="season" required value="${escapeHtml(uniform?.season ?? '')}" placeholder="2024" /></label>
            <label>TYPE
              <select name="kind" required>
                ${(['HOME', 'AWAY', 'SPECIAL'] as const).map((kind) => `<option value="${kind}"${uniform?.kind === kind || (!uniform && kind === 'HOME') ? ' selected' : ''}>${kind}</option>`).join('')}
              </select>
            </label>
            <label>MARKING
              <select name="marking" required data-collection-marking>
                <option value="NO MARKING"${!isMarking ? ' selected' : ''}>NO MARKING</option>
                <option value="MARKING"${isMarking ? ' selected' : ''}>MARKING</option>
              </select>
            </label>
            <div class="baseball-collection__marking-fields" data-collection-marking-fields ${isMarking ? '' : 'hidden'}>
              <label>PLAYER NAME<input name="playerName" value="${escapeHtml(uniform?.playerName ?? '')}" ${isMarking ? 'required' : ''} /></label>
              <label>NUMBER<input name="playerNumber" value="${escapeHtml(uniform?.playerNumber ?? '')}" ${isMarking ? 'required' : ''} /></label>
            </div>
            <label>SIZE<input name="size" required value="${escapeHtml(uniform?.size ?? '')}" placeholder="90 / 95 / M / XL" /></label>
            <label>PHOTO ${this.editorMode === 'add' ? '' : '(REPLACE OPTIONAL)'}
              <input name="image" type="file" accept="image/jpeg,image/png,image/webp" ${this.editorMode === 'add' ? 'required' : ''} />
            </label>
          </div>
          <p class="baseball-collection__form-help">JPG, PNG, WEBP · 실사 사진은 원본 비율로 표시됩니다.</p>
          <footer>
            <button type="button" data-collection-action="close-editor">CANCEL</button>
            <button type="submit">SAVE UNIFORM</button>
          </footer>
        </form>
      </div>`
  }

  private confirmDeleteMarkup() {
    const uniform = this.uniforms.find((candidate) => candidate.id === this.deletingId)
    if (!uniform) return ''

    return `
      <div class="baseball-collection__confirm-backdrop" role="presentation">
        <section class="baseball-collection__confirm" role="alertdialog" aria-labelledby="collection-delete-title" aria-modal="true">
          <h2 id="collection-delete-title">DELETE UNIFORM?</h2>
          <p><strong>${escapeHtml(uniform.name)}</strong>과 저장된 사진을<br/>컬렉션에서 삭제합니다.</p>
          <div>
            <button type="button" data-collection-action="cancel-delete">CANCEL</button>
            <button type="button" data-collection-action="confirm-delete" data-uniform-id="${uniform.id}">DELETE</button>
          </div>
        </section>
      </div>`
  }

  private async handleClick(event: Event) {
    const target = event.target as HTMLElement
    const button = target.closest<HTMLElement>('[data-collection-action]')
    if (!button) return

    const action = button.dataset.collectionAction
    const uniformId = button.dataset.uniformId

    if (action === 'category') {
      const category = button.dataset.category
      if (category === 'uniforms' || category === 'goods') {
        this.category = category
        this.editorMode = null
        this.deletingId = null
        this.render()
      }
      return
    }

    if (action === 'select' && uniformId) {
      this.selectedId = uniformId
      this.render()
      return
    }

    if (action === 'open-add') {
      this.editorMode = 'add'
      this.editingId = null
      this.deletingId = null
      this.render()
      return
    }

    if (action === 'edit' && uniformId) {
      this.editorMode = 'edit'
      this.editingId = uniformId
      this.deletingId = null
      this.render()
      return
    }

    if (action === 'close-editor') {
      this.editorMode = null
      this.editingId = null
      this.render()
      return
    }

    if (action === 'ask-delete' && uniformId) {
      this.deletingId = uniformId
      this.editorMode = null
      this.render()
      return
    }

    if (action === 'cancel-delete') {
      this.deletingId = null
      this.render()
      return
    }

    if (action === 'confirm-delete' && uniformId) {
      try {
        await this.repository.delete(uniformId)
        this.deletingId = null
        this.selectedId = this.selectedId === uniformId ? null : this.selectedId
        await this.refresh()
      } catch (error) {
        this.deletingId = null
        this.notice = error instanceof Error ? error.message : '유니폼을 삭제하지 못했습니다.'
        this.render()
      }
    }
  }

  private async handleSubmit(event: Event) {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-collection-form]')) return
    event.preventDefault()

    const values = new FormData(form)
    const name = valueFrom(values, 'name')
    const season = valueFrom(values, 'season')
    const kindValue = values.get('kind')
    const markingValue = values.get('marking')
    const size = valueFrom(values, 'size')
    const fileValue = values.get('image')
    const previous = this.editorMode === 'edit' ? this.editingUniform : null

    if (!name || !season || !size || !isUniformKind(kindValue) || !isUniformMarking(markingValue)) {
      this.notice = '필수 항목을 모두 입력해주세요.'
      this.render()
      return
    }

    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null
    if (file && !allowedImageTypes.has(file.type)) {
      this.notice = '실사 이미지는 JPG, PNG, WEBP 파일만 등록할 수 있습니다.'
      this.render()
      return
    }

    if (!file && !previous) {
      this.notice = '실사 이미지 파일을 선택해주세요.'
      this.render()
      return
    }

    const playerName = markingValue === 'MARKING' ? valueFrom(values, 'playerName') : ''
    const playerNumber = markingValue === 'MARKING' ? valueFrom(values, 'playerNumber') : ''
    if (markingValue === 'MARKING' && (!playerName || !playerNumber)) {
      this.notice = '마킹 유니폼은 선수 이름과 등번호를 입력해주세요.'
      this.render()
      return
    }

    const now = Date.now()
    const uniform: BaseballUniform = {
      id: previous?.id ?? (crypto.randomUUID?.() ?? `uniform-${now}`),
      name,
      season,
      kind: kindValue,
      marking: markingValue,
      ...(markingValue === 'MARKING' ? { playerName, playerNumber } : {}),
      size,
      image: file ?? previous!.image,
      imageName: file?.name ?? previous!.imageName,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    }

    try {
      await this.repository.put(uniform)
      this.editorMode = null
      this.editingId = null
      this.selectedId = uniform.id
      await this.refresh(uniform.id)
    } catch (error) {
      this.notice = error instanceof Error ? error.message : '유니폼을 저장하지 못했습니다.'
      this.render()
    }
  }

  private handleChange(event: Event) {
    const target = event.target
    if (!(target instanceof HTMLSelectElement) || !target.matches('[data-collection-marking]')) return

    const fields = this.root.querySelector<HTMLElement>('[data-collection-marking-fields]')
    if (!fields) return
    const isMarking = target.value === 'MARKING'
    fields.hidden = !isMarking
    fields.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.required = isMarking
      if (!isMarking) input.value = ''
    })
  }

  private handleImageError(event: Event) {
    const target = event.target
    if (!(target instanceof HTMLImageElement) || !target.matches('[data-collection-photo]')) return

    target.hidden = true
    const frame = target.closest<HTMLElement>('.baseball-collection__photo-frame')
    if (frame && !frame.querySelector('.baseball-collection__image-error')) {
      frame.insertAdjacentHTML('beforeend', '<p class="baseball-collection__image-error">이미지를 불러오지 못했습니다.</p>')
    }
  }
}
