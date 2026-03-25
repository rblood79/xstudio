/**
 * PixiDateRangePicker
 *
 * DatePicker와 100% 동일한 투명 히트 영역 래퍼.
 * PixiDatePicker를 재사용하여 코드 중복 제거.
 */

import { PixiDatePicker } from "./PixiDatePicker";
import type { PixiDatePickerProps } from "./PixiDatePicker";

export type PixiDateRangePickerProps = PixiDatePickerProps;

export const PixiDateRangePicker = PixiDatePicker;

export default PixiDateRangePicker;
