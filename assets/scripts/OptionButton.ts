import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('OptionButton')
export class OptionButton extends Component {

  @property(Label)
  textLabel: Label | null = null;

  private _value: string = '';
  private _gameManager: any = null;

  init(optionText: string, gameManager: any) {
    this._value = optionText;
    this._gameManager = gameManager;
    if (this.textLabel) {
      this.textLabel.string = optionText;
    }
  }

  onClick() {
    if (this._gameManager) {
      this._gameManager.onSelectOption(this._value);
    }
  }
}
