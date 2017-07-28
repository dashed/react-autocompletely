import React, {Component, Children} from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import mitt from 'mitt'

import MenuStatus from './menu-status'
import {AUTOCOMPLETE_CONTEXT, MENU_CONTEXT} from './constants'
import {cbToCb, scrollIntoView} from './utils'

class Menu extends Component {
  static contextTypes = {
    [AUTOCOMPLETE_CONTEXT]: PropTypes.object.isRequired,
  }

  static childContextTypes = {
    [MENU_CONTEXT]: PropTypes.object.isRequired,
  }

  static propTypes = {
    defaultHighlightedIndex: PropTypes.number,
    render: PropTypes.func.isRequired,
  }

  static defaultProps = {
    defaultHighlightedIndex: null,
  }

  static initialState = {
    highlightedIndex: null,
  }

  constructor(props, context) {
    super(props, context)
    this.autocomplete = this.context[AUTOCOMPLETE_CONTEXT]
  }

  state = Menu.initialState
  items = []
  emitter = mitt()

  reset = cb => {
    this.setState(Menu.initialState, cbToCb(cb))
  }

  changeHighlighedIndex = moveAmount => {
    const {highlightedIndex} = this.state
    const baseIndex = highlightedIndex === null ? -1 : highlightedIndex
    const itemsLastIndex = this.items.length - 1
    if (itemsLastIndex < 0) {
      return
    }
    let newIndex = baseIndex + moveAmount
    if (newIndex < 0) {
      newIndex = itemsLastIndex
    } else if (newIndex > itemsLastIndex) {
      newIndex = 0
    }
    this.setState(
      {
        highlightedIndex: newIndex,
      },
      () => {
        this.renderStatus()
      },
    )
    this.emitter.emit('changeHighlighedIndex', newIndex)
  }

  setHighlightedIndex = highlightedIndex => {
    this.setState({highlightedIndex})
  }

  setDefaultHighlightedIndex = () => {
    if (typeof this.props.defaultHighlightedIndex !== 'undefined') {
      this.setHighlightedIndex(this.props.defaultHighlightedIndex)
    }
  }

  getItemFromIndex = index => {
    if (!this.items || !this.items[0]) {
      return null
    }
    return this.items.find(itemInstance => {
      return itemInstance.props.index === index
    })
  }

  maybeScrollToHighlightedElement() {
    const itemInstance = this.getItemFromIndex(this.state.highlightedIndex)
    if (!itemInstance || !itemInstance.node) {
      return
    }
    scrollIntoView(itemInstance.node)
  }

  addItemInstance(itemInstance) {
    this.items.push(itemInstance)
  }

  removeItemInstance(itemInstance) {
    const index = this.items.indexOf(itemInstance)
    if (index !== -1) {
      this.items.splice(index, 1)
    }
  }

  getChildContext() {
    return {[MENU_CONTEXT]: this}
  }

  componentDidMount() {
    this.autocomplete.setMenu(this)
    this.autocomplete.emitter.on('menu:open', this.setDefaultHighlightedIndex)

    // attach node to end of document and render MenuStatus into it
    this._statusNode = document.createElement('div')
    document.body.appendChild(this._statusNode)
    this.renderStatus()
  }

  componentDidUpdate() {
    this.maybeScrollToHighlightedElement()
  }

  componentWillUnmount() {
    this.autocomplete.removeMenu(this)
    this.autocomplete.emitter.off('menu:open', this.setDefaultHighlightedIndex)

    // cleanup MenuStatus component
    ReactDOM.unmountComponentAtNode(this._statusNode)
    document.body.removeChild(this._statusNode)
  }

  renderStatus() {
    const {inputValue} = this.autocomplete.state
    const {highlightedIndex} = this.state
    ReactDOM.unstable_renderSubtreeIntoContainer(
      this,
      <MenuStatus
        highlightedIndex={highlightedIndex}
        inputValue={inputValue}
      />,
      this._statusNode,
    )
  }

  render() {
    return this.props.render(this.autocomplete.getControllerStateAndHelpers())
  }
}

export default Menu
