import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

  @property(Label)
  tipsLabel: Label | null = null;

  start() {
    if (this.tipsLabel) {
      this.tipsLabel.string = '点下面的按钮试试';
    }
  }

  onClickButton() {
    if (this.tipsLabel) {
      this.tipsLabel.string = '按钮被点击了！';
    }
  }
}
