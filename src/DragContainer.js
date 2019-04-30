import React from "react";
import { View, PanResponder, Modal, Easing, Animated, TouchableWithoutFeedback } from "react-native";
import PropTypes from "prop-types";

global.Easing = Easing;

const allOrientations = ["portrait", "portrait-upside-down", "landscape", "landscape-left", "landscape-right"];

class DragModal extends React.Component {
  componentWillUnmount() {
    console.log("DragModal UNMOUNT");
  }

  componentWillMount() {
    console.log("DragModal MOUNT");
  }

  render() {
    const { content, renderContainerContent, location, drop } = this.props;

    return (
      <Modal transparent={true} supportedOrientations={allOrientations}>
        <TouchableWithoutFeedback onPressIn={drop}>
          <Animated.View style={location.getLayout()}>{content.children}</Animated.View>
        </TouchableWithoutFeedback>
        {renderContainerContent && renderContainerContent()}
      </Modal>
    );
  }
}

class DragContainer extends React.Component {
  constructor(props) {
    super(props);
    this.displayName = "DragContainer";
    this.containerLayout;
    this.dropZones = [];
    this.draggables = [];
  }

  state = {};

  location = new Animated.ValueXY();
  finger = new Animated.ValueXY();

  static propTypes = {
    onDragStart: PropTypes.func,
    onDragEnd: PropTypes.func,
    onDrag: PropTypes.func
  };

  componentWillUnmount() {
    console.log("DragContainer UNMOUNTING");
    if (this._listener) this.location.removeListener(this._listener);
  }

  getDragContext() {
    return {
      dropZones: this.dropZones,
      onDrag: this.onDrag,
      container: this.containerLayout,
      dragging: this.state.draggingComponent,
      updateZone: this.updateZone,
      removeZone: this.removeZone
    };
  }

  getChildContext() {
    return { dragContext: this.getDragContext() };
  }

  static childContextTypes = {
    dragContext: PropTypes.any
  };

  updateZone = details => {
    let zone = this.dropZones.find(x => x.ref === details.ref);
    if (!zone) {
      this.dropZones.push(details);
    } else {
      let i = this.dropZones.indexOf(zone);
      this.dropZones.splice(i, 1, details);
    }
  };

  removeZone = ref => {
    let i = this.dropZones.find(x => x.ref === ref);
    if (i !== -1) {
      this.dropZones.splice(i, 1);
    }
  };

  inZone = ({ x, y }, zone) => {
    return zone.x <= x && zone.width + zone.x >= x && zone.y <= y && zone.height + zone.y >= y;
  };

  _addLocationOffset = point => {
    if (!this.state.draggingComponent) return point;
    return {
      x: point.x + this.state.draggingComponent.startPosition.width / 2,
      y: point.y + this.state.draggingComponent.startPosition.height / 2
    };
  };

  _handleDragging = point => {
    const { onDrag } = this.props;

    if (point) {
      point = this._addLocationOffset(point);
    }

    if (onDrag) {
      onDrag(point);
    }

    this._point = point;
    if (this._locked || !point) return;
    this.dropZones.forEach(zone => {
      if (this.inZone({ x: this.finger.x._value, y: this.finger.y._value }, zone)) {
        zone.onEnter(point);
      } else {
        zone.onLeave(point);
      }
    });
  };

  _handleDrop = () => {
    let hitZones = [];
    this.dropZones.forEach(zone => {
      if (!this._point) return;
      if (this.inZone({ x: this.finger.x._value, y: this.finger.y._value }, zone)) {
        hitZones.push(zone);
        zone.onDrop(this.state.draggingComponent.data);
      }
    });
    if (this.props.onDragEnd) this.props.onDragEnd(this.state.draggingComponent, hitZones);
    if (!hitZones.length && this.state.draggingComponent && this.state.draggingComponent.ref) {
      this._locked = true;
      return Animated.timing(this.location, {
        duration: 400,
        easing: Easing.elastic(1),
        toValue: {
          x: 0, //this._offset.x - x,
          y: 0 //his._offset.y - y
        }
      }).start(() => {
        this._locked = false;
        this._handleDragging({ x: -100000, y: -100000 });
        this.setState({
          draggingComponent: null
        });
      });
    }
    this._handleDragging({ x: -100000, y: -100000 });
    this.setState({
      draggingComponent: null
    });
  };

  componentWillMount() {
    this._listener = this.location.addListener(this._handleDragging);
    this._panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: () => {
        if (this.state.draggingComponent) {
          this._handleDrop();
        }
        return false;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => !!this.state.draggingComponent,
      //        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
      onPanResponderMove: Animated.event([
        null,
        {
          moveX: this.finger.x,
          moveY: this.finger.y,
          dx: this.location.x, // x,y are Animated.Value
          dy: this.location.y
        }
      ]),
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (!this.state.draggingComponent) return;
        //Ensures we exit all of the active drop zones
        this._handleDrop();
      }
    });
  }

  onDrag = (ref, children, data) => {
    ref.measure((...args) => {
      this._offset = { x: args[4], y: args[5] };
      this.location.setValue({ x: 0, y: 0 });
      this.location.setOffset(this._offset);

      this.setState(
        {
          draggingComponent: {
            ref,
            data,
            children: React.Children.map(children, child => {
              return React.cloneElement(child, { dragging: true });
            }),
            startPosition: {
              x: args[4],
              y: args[5],
              width: args[2],
              height: args[3]
            }
          }
        },
        () => {
          if (this.props.onDragStart) this.props.onDragStart(this.state.draggingComponent);
        }
      );
    });
  };

  render() {
    return (
      <View
        style={[{ flex: 1 }, this.props.style]}
        onLayout={e => (this.containerLayout = e.nativeEvent.layout)}
        {...this._panResponder.panHandlers}
      >
        {this.props.children}
        {this.state.draggingComponent ? (
          <DragModal
            content={this.state.draggingComponent}
            renderContainerContent={this.props.renderContainerContent}
            location={this.location}
            drop={this._handleDrop}
          />
        ) : null}
      </View>
    );
  }
}

export default DragContainer;
