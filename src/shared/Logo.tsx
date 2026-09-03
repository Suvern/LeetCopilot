type LogoProps = {
  class?: string;
  title?: string;
};

const logoSrc = typeof chrome !== 'undefined' && chrome.runtime?.getURL
  ? chrome.runtime.getURL('leetlens-logo.png')
  : '/leetlens-logo.png';

export function LeetLensLogo(props: LogoProps) {
  return <img class={props.class} src={logoSrc} alt={props.title ?? ''} aria-hidden={props.title ? undefined : true} />;
}
