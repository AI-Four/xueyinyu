import { _decorator, Component, Label, resources, JsonAsset } from 'cc';
import { OptionButton } from './OptionButton';
const { ccclass, property } = _decorator;

type Question = {
  id: number;
  audio: string;
  answer: string;
  options: string[];
};

@ccclass('GameManager')
export class GameManager extends Component {

  @property(Label)
  tipsLabel: Label | null = null;

  @property(OptionButton)
  optionButtons: OptionButton[] = [];

  private _questions: Question[] = [];
  private _currentIndex = 0;

  start() {
    this.loadQuestions();
  }

  loadQuestions() {
    resources.load('questions', JsonAsset, (err, jsonAsset) => {
      if (err) {
        console.error(err);
        return;
      }
      this._questions = (jsonAsset!.json as Question[]);
      this._currentIndex = 0;
      this.showQuestion();
    });
  }

  showQuestion() {
    if (!this._questions.length) return;

    const q = this._questions[this._currentIndex];
    if (this.tipsLabel) {
      this.tipsLabel.string = `第 ${this._currentIndex + 1} 题：点正确的句子`;
    }

    // 简单：按顺序填充选项按钮
    q.options.forEach((opt, idx) => {
      if (this.optionButtons[idx]) {
        this.optionButtons[idx].init(opt, this);
      }
    });
  }

  onSelectOption(value: string) {
    const q = this._questions[this._currentIndex];
    const correct = value === q.answer;
    if (this.tipsLabel) {
      this.tipsLabel.string = correct ? '✅ 回答正确！' : '❌ 再试一次';
    }

    if (correct) {
      // 简单延迟切下一题
      this.scheduleOnce(() => {
        this.nextQuestion();
      }, 1);
    }
  }

  nextQuestion() {
    this._currentIndex++;
    if (this._currentIndex >= this._questions.length) {
      this._currentIndex = 0;
      if (this.tipsLabel) {
        this.tipsLabel.string = '全部完成！再来一遍吧～';
      }
    }
    this.showQuestion();
  }

  onClickPlayAudio() {
    // TODO: Day2 接音频
    if (this.tipsLabel) {
      this.tipsLabel.string = '（这里以后会播放英语音频）';
    }
  }
}
