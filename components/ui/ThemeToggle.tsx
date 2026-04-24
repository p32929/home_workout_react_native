import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';

export function ThemeToggle() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  function toggle() {
    Uniwind.setTheme(isDark ? 'light' : 'dark');
  }

  const Icon = isDark ? SunIcon : MoonStarIcon;

  return (
    <TouchableOpacity
      onPress={toggle}
      className="w-9 h-9 items-center justify-center rounded-full">
      <Icon size={20} color={isDark ? '#e5e5e5' : '#171717'} />
    </TouchableOpacity>
  );
}
