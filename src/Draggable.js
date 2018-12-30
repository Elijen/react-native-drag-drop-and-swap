/*
 * @Author: Ranvir Gorai
 * @Date: 2018-01-30 15:04:14
 * @Last Modified by: Ranvir Gorai
 * @Last Modified time: 2018-01-30 16:58:05
 */
import React from "react";
import { View, TouchableOpacity } from "react-native";
import PropTypes from "prop-types";

class Draggable extends React.Component {
  constructor(props) {
    super(props);
    this.displayName = "Draggable";
    this._initiateDrag = this._initiateDrag.bind(this);
  }

  static contextTypes = {
    dragContext: PropTypes.any
  };

  static propTypes = {
    dragOn: PropTypes.oneOf(["onLongPress", "onPressIn"])
  };

  _initiateDrag() {
    if (!this.props.disabled) this.context.dragContext.onDrag(this.refs.wrapper, this.props.children, this.props.data);
  }

  static defaultProps = {
    dragOn: "onLongPress"
  };

  render() {
    const { dragging } = this.context.dragContext;
    const { data } = this.props;

    let isDragging = dragging && dragging.data && data && data.index === dragging.data.index;
    return (
      <TouchableOpacity
        activeOpacity={this.props.activeOpacity}
        style={this.props.style}
        onLongPress={this.props.dragOn === "onLongPress" ? this._initiateDrag : null}
        onPress={this.props.onPress}
        onPressIn={this.props.dragOn === "onPressIn" ? this._initiateDrag : null}
        ref="wrapper"
      >
        {React.Children.map(this.props.children, child => {
          return React.cloneElement(child, { ghost: isDragging });
        })}
      </TouchableOpacity>
    );
  }
}

export default Draggable;
