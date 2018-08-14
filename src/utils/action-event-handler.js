export default class ActionEventHandler {
  constructor(scene, cursor) {
    this.scene = scene;
    this.cursor = cursor;
    this.cursorHand = this.cursor.data.cursor.components["super-hands"];
    this.isCursorInteracting = false;
    this.isTeleporting = false;
    this.handThatAlsoDrivesCursor = null;
    this.hovered = false;

    this.gotPrimaryDown = false;

    this.onPrimaryDown = this.onPrimaryDown.bind(this);
    this.onPrimaryUp = this.onPrimaryUp.bind(this);
    this.onSecondaryDown = this.onSecondaryDown.bind(this);
    this.onSecondaryUp = this.onSecondaryUp.bind(this);
    this.onPrimaryGrab = this.onPrimaryGrab.bind(this);
    this.onPrimaryRelease = this.onPrimaryRelease.bind(this);
    this.onSecondaryGrab = this.onSecondaryGrab.bind(this);
    this.onSecondaryRelease = this.onSecondaryRelease.bind(this);
    this.onCardboardButtonDown = this.onCardboardButtonDown.bind(this);
    this.onCardboardButtonUp = this.onCardboardButtonUp.bind(this);
    this.onScrollMove = this.onScrollMove.bind(this);
    this.addEventListeners();
  }

  addEventListeners() {
    this.scene.addEventListener("action_primary_down", this.onPrimaryDown);
    this.scene.addEventListener("action_primary_up", this.onPrimaryUp);
    this.scene.addEventListener("action_secondary_down", this.onSecondaryDown);
    this.scene.addEventListener("action_secondary_up", this.onSecondaryUp);
    this.scene.addEventListener("primary_action_grab", this.onPrimaryGrab);
    this.scene.addEventListener("primary_action_release", this.onPrimaryRelease);
    this.scene.addEventListener("secondary_action_grab", this.onSecondaryGrab);
    this.scene.addEventListener("secondary_action_release", this.onSecondaryRelease);
    this.scene.addEventListener("scroll", this.onScrollMove);
    this.scene.addEventListener("cardboardbuttondown", this.onCardboardButtonDown); // TODO: These should be actions
    this.scene.addEventListener("cardboardbuttonup", this.onCardboardButtonUp);
  }

  tearDown() {
    this.scene.removeEventListener("action_primary_down", this.onPrimaryDown);
    this.scene.removeEventListener("action_primary_up", this.onPrimaryUp);
    this.scene.removeEventListener("action_secondary_down", this.onSecondaryDown);
    this.scene.removeEventListener("action_secondary_up", this.onSecondaryUp);
    this.scene.removeEventListener("primary_action_grab", this.onPrimaryGrab);
    this.scene.removeEventListener("primary_action_release", this.onPrimaryRelease);
    this.scene.removeEventListener("secondary_action_grab", this.onSecondaryGrab);
    this.scene.removeEventListener("secondary_action_release", this.onSecondaryRelease);
    this.scene.removeEventListener("scroll_move", this.onScrollMove);
    this.scene.removeEventListener("cardboardbuttondown", this.onCardboardButtonDown);
    this.scene.removeEventListener("cardboardbuttonup", this.onCardboardButtonUp);
  }

  onScrollMove(e) {
    this.cursor.changeDistanceMod(-e.detail.axis[1] / 8);
  }

  setHandThatAlsoDrivesCursor(handThatAlsoDrivesCursor) {
    this.handThatAlsoDrivesCursor = handThatAlsoDrivesCursor;
  }

  isSticky(el) {
    return el && el.matches(".sticky, .sticky *");
  }

  isHandThatAlsoDrivesCursor(el) {
    return this.handThatAlsoDrivesCursor === el;
  }

  onGrab(e, event) {
    event = event || e.type;
    const superHand = e.target.components["super-hands"];
    const isCursorHand = this.isHandThatAlsoDrivesCursor(e.target);
    if (isCursorHand && !this.isCursorInteracting) {
      if (superHand.state.has("hover-start") || superHand.state.get("grab-start")) {
        e.target.emit(event);
      } else {
        this.isCursorInteracting = this.cursor.startInteraction();
      }
    } else if (isCursorHand && this.isCursorInteracting) {
      this.cursorHand.el.emit(event);
    } else {
      e.target.emit(event);
    }
  }

  onRelease(e, event) {
    event = event || e.type;
    const isCursorHand = this.isHandThatAlsoDrivesCursor(e.target);
    if (this.isCursorInteracting && isCursorHand) {
      //need to check both grab-start and hover-start in the case that the spawner is being grabbed this frame
      if (this.isSticky(this.cursorHand.state.get("grab-start") || this.cursorHand.state.get("hover-start"))) {
        this.cursorHand.el.emit(event);
        this.isCursorInteracting = !!this.cursorHand.state.get("grab-start");
      } else {
        this.isCursorInteracting = false;
        this.cursor.endInteraction();
      }
    } else {
      e.target.emit(event);
    }
  }

  onPrimaryGrab(e) {
    this.onGrab(e, "primary_hand_grab");
  }

  onPrimaryRelease(e) {
    this.onRelease(e, "primary_hand_release");
  }

  onSecondaryGrab(e) {
    this.onGrab(e, "secondary_hand_grab");
  }

  onSecondaryRelease(e) {
    this.onRelease(e, "secondary_hand_release");
  }

  onDown(e, event) {
    this.onGrab(e, event);

    if (
      this.isHandThatAlsoDrivesCursor(e.target) &&
      !this.isCursorInteracting &&
      !this.cursorHand.state.get("grab-start")
    ) {
      this.cursor.setCursorVisibility(false);
      const button = e.target.components["teleport-controls"].data.button;
      e.target.emit(button + "down");
      this.isTeleporting = true;
    }
  }

  onUp(e, event) {
    if (this.isTeleporting && this.isHandThatAlsoDrivesCursor(e.target)) {
      const superHand = e.target.components["super-hands"];
      this.cursor.setCursorVisibility(!superHand.state.has("hover-start"));
      const button = e.target.components["teleport-controls"].data.button;
      e.target.emit(button + "up");
      this.isTeleporting = false;
    } else {
      this.onRelease(e, event);
    }
  }

  onPrimaryDown(e) {
    this.onDown(e, "primary_hand_grab");
    this.gotPrimaryDown = true;
  }

  onPrimaryUp(e) {
    if (this.gotPrimaryDown) {
      this.onUp(e, "primary_hand_release");
    } else {
      this.onUp(e, "secondary_hand_release");
    }
    this.gotPrimaryDown = false;
  }

  onSecondaryDown(e) {
    this.onDown(e, "secondary_hand_grab");
  }

  onSecondaryUp(e) {
    this.onUp(e, "secondary_hand_release");
  }

  onCardboardButtonDown(e) {
    this.isCursorInteracting = this.cursor.startInteraction();
    if (this.isCursorInteracting) {
      return;
    }

    this.cursor.setCursorVisibility(false);

    const gazeTeleport = e.target.querySelector("#gaze-teleport");
    const button = gazeTeleport.components["teleport-controls"].data.button;
    gazeTeleport.emit(button + "down");
    this.isTeleporting = true;
  }

  onCardboardButtonUp(e) {
    if (this.isCursorInteracting) {
      this.isCursorInteracting = false;
      this.cursor.endInteraction();
      return;
    }

    this.cursor.setCursorVisibility(true);

    const gazeTeleport = e.target.querySelector("#gaze-teleport");
    const button = gazeTeleport.components["teleport-controls"].data.button;
    gazeTeleport.emit(button + "up");
    this.isTeleporting = false;
  }

  manageCursorEnabled() {
    const handState = this.handThatAlsoDrivesCursor.components["super-hands"].state;
    const handHoveredThisFrame = !this.hovered && handState.has("hover-start") && !this.isCursorInteracting;
    const handStoppedHoveringThisFrame =
      this.hovered === true && !handState.has("hover-start") && !handState.has("grab-start");
    if (handHoveredThisFrame) {
      this.hovered = true;
      this.cursor.disable();
    } else if (handStoppedHoveringThisFrame) {
      this.hovered = false;
      this.cursor.enable();
      this.cursor.setCursorVisibility(!this.isTeleporting);
    }
  }
}
