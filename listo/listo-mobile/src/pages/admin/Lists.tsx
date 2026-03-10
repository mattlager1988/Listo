import React from 'react';
import { NavBar, ErrorBlock } from 'antd-mobile';
import { UnorderedListOutline } from 'antd-mobile-icons';
import { useMenu } from '../../contexts/MenuContext';

const Lists: React.FC = () => {
  const { openMenu } = useMenu();

  return (
    <>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px' }}
      >
        Lists
      </NavBar>
      <ErrorBlock status="empty" title="Coming Soon" description="List management will be available here" />
    </>
  );
};

export default Lists;
